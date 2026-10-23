import logger from '../models/logger.model.js';
import { RULES_GAMES } from '../utils/rules.kinds.js';
import db from '../models/db.model.js';
import { knownInClub } from '../models/player.model.js';
import { clubKpis, headToHead, clubRecords, gameLog } from '../utils/club.insights.js';
import { playerLevel, levelInputs } from '../utils/levels.js';
import { countBadges } from '../utils/badges.js';
import { recentForm } from '../utils/chart.data.js';
import { formFigures } from '../utils/form.figures.js';
import { isShameChild, shameCountIn, shameCountsFrom, shameMinAgeOf } from '../utils/shame.js';
import { gamesOverview } from '../utils/games.overview.js';

const LEADERBOARD_SIZE = 5;
const RECENT_GAMES = 20;
const RUNNING_GAMES = 10;
// A win rate only means something after a few games
const MIN_GAMES_FOR_WIN_RATE = 5;

const GAME_TYPES = [
    { type: 'x01', model: () => db.x01 },
    { type: 'cricket', model: () => db.cricket },
    { type: 'elimination', model: () => db.elimination },
    { type: 'clock', model: () => db.clock },
    { type: 'rules', model: () => db.rulesGame },
];

const describeFormat = (type, game) => {
    switch (type) {
        case 'x01': return `${game.startingScore} · ${game.setMode} ${game.numberOfSets} sets · ${game.legMode} ${game.numberOfLegs} legs`;
        case 'elimination': return `Target ${game.targetScore}`;
        case 'clock': return `Around the Clock · ${game.mode ?? 'All'}`;
        case 'rules': return RULES_GAMES[game.kind] ?? '';
        default: return 'Cricket';
    }
};

const dartsThrown = (type, model) => {
    if (type === 'clock' || type === 'rules') return model.darts ?? 0;
    return (type === 'elimination' ? model.totalThrow?.darts : model.totalThrow?.game?.darts) ?? 0;
};

/**
 * Adds up what each player did over all finished games of the club.
 */
const collectPlayerTotals = (gamesByType) => {
    const totals = new Map();
    const of = (playerId) => {
        if (!totals.has(playerId)) {
            totals.set(playerId, {
                games: 0, wins: 0, winsX01: 0, winsCricket: 0, winsElimination: 0, winsClock: 0, winsRules: 0,
                darts: 0, num180s: 0, highestCheckout: 0, averageSum: 0, averageRounds: 0,
            });
        }
        return totals.get(playerId);
    };

    for (const { type, games } of gamesByType) {
        for (const game of games) {
            for (const playerId of game.players ?? []) {
                const model = game.playerModels?.[playerId] ?? {};
                const player = of(playerId);
                player.games += 1;
                player.darts += dartsThrown(type, model);
                if (model.hasWonGame) {
                    player.wins += 1;
                    player[{ x01: 'winsX01', cricket: 'winsCricket', elimination: 'winsElimination', clock: 'winsClock', rules: 'winsRules' }[type]] += 1;
                }
                if (type === 'x01') {
                    player.num180s += model.scoreRanges?.game?.['180'] ?? 0;
                    for (const checkout of Object.keys(model.checkoutScores?.game ?? {})) {
                        player.highestCheckout = Math.max(player.highestCheckout, Number(checkout) || 0);
                    }
                    // weight each game's average by its rounds, so long games count more
                    const rounds = model.totalThrow?.game?.rounds ?? 0;
                    player.averageSum += (model.averages?.game?.overall ?? 0) * rounds;
                    player.averageRounds += rounds;
                }
            }
        }
    }
    return totals;
};

const buildLeaderboards = (totals, memberIds) => {
    const members = [...totals.entries()].filter(([playerId]) => memberIds.has(playerId));
    const top = (valueOf, qualifies = () => true) => members
        .filter(([, t]) => qualifies(t))
        .map(([player, t]) => ({ player, value: valueOf(t) }))
        .filter(entry => entry.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, LEADERBOARD_SIZE);
    const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;

    return {
        mostGames: top(t => t.games),
        mostWins: top(t => t.wins),
        winRate: top(t => round(t.wins / t.games * 100, 1), t => t.games >= MIN_GAMES_FOR_WIN_RATE),
        winsX01: top(t => t.winsX01),
        winsCricket: top(t => t.winsCricket),
        winsElimination: top(t => t.winsElimination),
        winsClock: top(t => t.winsClock),
        x01Average: top(t => round(t.averageSum / t.averageRounds, 2), t => t.averageRounds > 0),
        most180s: top(t => t.num180s),
        highestCheckout: top(t => t.highestCheckout),
        mostDarts: top(t => t.darts),
    };
};

const summarizeGame = (type, game) => ({
    id: String(game._id),
    // a game of the rules engine by its kind
    type: type === 'rules' ? game.kind : type,
    format: describeFormat(type, game),
    running: Boolean(game.gameIsRunning) && !game.hasWinner,
    playedAt: game.updatedAt,
    players: (game.players ?? []).map(playerId => {
        const model = game.playerModels?.[playerId] ?? {};
        return {
            player: playerId,
            score: model.score ?? null,
            ...(type === 'x01' && { sets: model.setsWon ?? 0, legs: model.legsWon?.game ?? 0 }),
            isWinner: Boolean(model.hasWonGame),
        };
    }),
});

/**
 * Everything the club dashboard shows: facts about the club, leaderboards
 * over all finished games and the most recent games.
 */
export const getClubStats = async (req, res) => {
    logger.debug('club stats called');
    const club = req.club;
    const filter = { club: club._id };

    const [players, gamesByType] = await Promise.all([
        // former members too: their games still count in the club's leaderboards
        db.player.find(knownInClub(club._id), 'firstname lastname nickname profileImg guest activity').lean(),
        Promise.all(GAME_TYPES.map(async ({ type, model }) => ({ type, games: await model().find(filter).lean() }))),
    ]);

    const finishedByType = gamesByType.map(({ type, games }) => ({ type, games: games.filter(game => game.hasWinner) }));
    // friendly games are left out of the club's rankings: the leaderboards and the records
    const rankedByType = finishedByType.map(({ type, games }) => ({ type, games: games.filter(game => !game.friendly) }));
    const allGames = gamesByType.flatMap(({ type, games }) => games.map(game => ({ type, game })));
    const members = players.filter(player => !player.guest);

    const count = (type) => finishedByType.find(entry => entry.type === type).games.length;
    const newestFirst = allGames.sort((a, b) => b.game.updatedAt - a.game.updatedAt);
    const recent = newestFirst.slice(0, RECENT_GAMES);
    const running = newestFirst.filter(({ game }) => game.gameIsRunning && !game.hasWinner);

    res.json({
        club: {
            id: String(club._id),
            name: club.name,
            description: club.description ?? '',
            logo: club.logo || null,
            createdAt: club.createdAt,
            isPublic: Boolean(club.isPublic),
            playerCount: members.length,
            adminCount: club.admins.length,
        },
        totals: {
            gamesPlayed: finishedByType.reduce((sum, { games }) => sum + games.length, 0),
            running: running.length,
            x01: count('x01'),
            cricket: count('cricket'),
            elimination: count('elimination'),
            clock: count('clock'),
            rules: count('rules'),
            lastGameAt: recent[0]?.game.updatedAt ?? null,
        },
        // guests are included so past games can show their names; leaderboards only rank club members
        players: players.map(player => ({
            id: String(player._id),
            firstname: player.firstname,
            lastname: player.lastname,
            nickname: player.nickname,
            profileImg: player.profileImg,
            guest: player.guest,
        })),
        leaderboards: buildLeaderboards(collectPlayerTotals(rankedByType), new Set(members.map(player => String(player._id)))),
        recentGames: recent.map(({ type, game }) => summarizeGame(type, game)),
        runningGames: running.slice(0, RUNNING_GAMES).map(({ type, game }) => summarizeGame(type, game)),
        // key figures, who beats whom, records and when the club plays
        kpis: clubKpis({ finishedByType, allGames, members }),
        headToHead: headToHead(finishedByType, new Set(members.map(player => String(player._id)))),
        records: clubRecords(rankedByType.find(entry => entry.type === 'x01').games),
        gameLog: gameLog(allGames),
    });
};

/**
 * The games of the club at a glance, over all of them (the lists show only
 * the latest): see utils/games.overview.js, with the players to show.
 */
export const getGamesOverview = async (req, res) => {
    logger.debug('games overview called');
    try {
        const filter = { club: req.club._id };
        const [players, gamesByType] = await Promise.all([
            db.player.find(knownInClub(req.club._id), 'firstname lastname nickname profileImg guest').lean(),
            Promise.all(GAME_TYPES.map(async ({ type, model }) => ({ type, games: await model().find(filter, 'players playerModels hasWinner gameIsRunning kind friendly createdAt updatedAt').lean() }))),
        ]);
        const members = players.filter(player => !player.guest);
        res.json({
            ...gamesOverview(gamesByType, new Set(members.map(player => String(player._id)))),
            playersById: Object.fromEntries(members.map(({ _id, firstname, lastname, nickname, profileImg }) => [String(_id), { id: String(_id), firstname, lastname, nickname, profileImg }])),
        });
    } catch (err) {
        logger.error(err, 'Failed to load the games overview');
        res.status(500).json({ message: 'The games could not be loaded.' });
    }
};

const PLAYER_GAMES = 5;

/**
 * A player's latest games in the selected club, newest first, with the
 * names of everyone who played in them and how many games there are in all.
 */
export const getPlayerGames = async (req, res) => {
    logger.debug('player games called');
    const playerId = req.params.id;
    const filter = { club: req.club._id, players: playerId };
    const limit = Math.min(Number(req.query.limit) || PLAYER_GAMES, 50);

    const gamesByType = await Promise.all(GAME_TYPES.map(async ({ type, model }) => ({
        type,
        games: await model().find(filter).sort({ updatedAt: -1 }).limit(limit).lean(),
        total: await model().countDocuments(filter),
    })));
    const latest = gamesByType
        .flatMap(({ type, games }) => games.map(game => ({ type, game })))
        .sort((a, b) => b.game.updatedAt - a.game.updatedAt)
        .slice(0, limit);

    const playerIds = [...new Set(latest.flatMap(({ game }) => game.players ?? []))];
    const players = await db.player.find({ _id: { $in: playerIds } }, 'firstname lastname nickname profileImg guest').lean();

    res.json({
        total: gamesByType.reduce((sum, { total }) => sum + total, 0),
        games: latest.map(({ type, game }) => summarizeGame(type, game)),
        players: players.map(({ _id, ...player }) => ({ id: String(_id), ...player })),
    });
};

/**
 * The level of every club member, for lists of players: { [playerId]: { name, index, xp } }.
 * A level belongs to the person, so it counts their games in all their clubs.
 */
export const getPlayerLevels = async (req, res) => {
    logger.debug('player levels called');
    const players = await db.player.find({ ...knownInClub(req.club._id), guest: { $ne: true } }, 'badges').lean();
    const filter = { players: { $in: players.map(player => String(player._id)) }, gameIsRunning: false };
    const [x01, cricket, elimination, clock, rules] = await Promise.all([
        db.x01.find(filter).lean(),
        db.cricket.find(filter).lean(),
        db.elimination.find(filter).lean(),
        db.clock.find(filter).lean(),
        db.rulesGame.find(filter).lean(),
    ]);
    const of = (games, id) => games.filter(game => (game.players ?? []).map(String).includes(id));
    const levels = {};
    for (const player of players) {
        const id = String(player._id);
        const { level, xp } = playerLevel(levelInputs({
            x01Games: of(x01, id), cricketGames: of(cricket, id), eliminationGames: of(elimination, id), clockGames: of(clock, id), rulesGames: of(rules, id),
            playerId: id, badgeCount: countBadges(player.badges),
        }));
        levels[id] = { id: level.id, name: level.name, index: level.index, xp };
    }
    res.json(levels);
};

const FORM_GAMES = 5;

/**
 * The current form of players being compared, from each one's own latest X01
 * games in the club (not only the games they played together): the last five
 * against the five before. { [playerId]: { trend, change, recentAverage, … } }
 */
export const getPlayersForm = async (req, res) => {
    logger.debug('players form called');
    const ids = [...new Set(req.body.playerIds)];
    const forms = await Promise.all(ids.map(async (playerId) => {
        const games = await db.x01
            .find({ club: req.club._id, players: playerId, gameIsRunning: false })
            .sort({ updatedAt: -1 })
            .limit(FORM_GAMES * 2)
            .lean();
        // the figures of the same games: the latest ones against those before
        const played = games
            .filter(game => (game.playerModels?.[playerId]?.totalThrow?.game?.rounds ?? 0) > 0)
            .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
        const recent = played.slice(-FORM_GAMES);
        const before = played.slice(0, -FORM_GAMES);
        // the shame badges got in these games: only where the club has a Hall of Shame and the player counts for it
        const minAge = shameMinAgeOf(req.club);
        const player = req.club.shameBadges !== false && db.mongoose.isValidObjectId(playerId)
            ? await db.player.findById(playerId, 'shame dateOfBirth').lean()
            : null;
        const shameOf = player && !isShameChild(player, minAge)
            ? (list) => shameCountIn(player, list.map(game => game._id), shameCountsFrom(player, minAge))
            : null;
        const figuresOf = (list) => ({ ...formFigures(list, playerId), ...(shameOf && { shameBadges: shameOf(list) }) });
        return [playerId, {
            ...recentForm(games, playerId, FORM_GAMES),
            figures: {
                recent: figuresOf(recent),
                previous: before.length ? figuresOf(before) : null,
            },
        }];
    }));
    res.json(Object.fromEntries(forms));
};
