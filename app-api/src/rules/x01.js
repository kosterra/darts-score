/**
 * X01 for the rules engine: sets and legs, the in and out modes, a handicap
 * per player, and every figure of the players as the app has always kept them
 * (averages, checkouts, score ranges, … per game, set and leg).
 *
 * The state is the game as the screens and the statistics read it: the
 * settings, "playerModels", "allSetsThrows" (the finished legs, visit by
 * visit), "currentLegThrows", whose turn it is, the set and leg played. It
 * follows from the settings and the visits alone: replayX01(game) works it
 * out, x01Visit(state, darts) applies one visit.
 *
 * No texts and no React here: the API keeps a copy of this file (see
 * rules.copy.test.js) to work out the same from the stored visits.
 */
import { DARTS_PER_VISIT, replayGame } from './engine.js';

// what the stored game keeps besides its visits and the cached results
export const X01_SETTINGS = ['startingScore', 'setMode', 'legMode', 'legInMode', 'legOutMode', 'numberOfSets', 'numberOfLegs', 'legStarter', 'roundLimit', 'bull'];

const PLAYER_RULES = ['startingScore', 'legInMode', 'legOutMode'];

const own = (game, playerId) => game?.playerModels?.[playerId] ?? {};

/**
 * Doubles: two teams of two, who share their score, legs and sets; each
 * player keeps their own figures. The players are in the order they throw,
 * the teams taking turns: the first and third player against the second and
 * fourth. → [[a1, a2], [b1, b2]], or null for a game of single players.
 */
export const teamsOf = (game) => (game?.doubles && game.players?.length === 4
    ? [[game.players[0], game.players[2]], [game.players[1], game.players[3]]]
    : null);
// the partner of a player in doubles (none otherwise)
export const partnersOf = (game, playerId) => (teamsOf(game)?.find(team => team.includes(playerId)) ?? [playerId]).filter(id => id !== playerId);
// who play as one: the teams in doubles, otherwise each player alone
export const sidesOf = (game) => teamsOf(game) ?? (game?.players ?? []).map(id => [id]);

// each player's side, by its first player: { [playerId]: sideId } (in doubles both partners → the team's first)
export const sideKeysOf = (game) => Object.fromEntries(sidesOf(game).flatMap(side => side.map(id => [id, side[0]])));

/**
 * The visits of one leg ([{ playerId, scoreLeft, … }]) with what was left
 * before each and what it took off (0 for a bust), from the score of its
 * side: in doubles a partner's visit counts on the same score.
 * → [{ visit, before, scoreLeft, taken }]
 */

export const legScores = (game, leg) => {
    const keyOf = sideKeysOf(game);
    const left = {};
    return (leg ?? []).map(visit => {
        const id = visit?.playerId;
        const key = keyOf[id] ?? id;
        const before = left[key] ?? startingScoreOf(game, id);
        const scoreLeft = Number(visit?.scoreLeft);
        if (Number.isFinite(scoreLeft)) left[key] = scoreLeft;
        return { visit, before, scoreLeft, taken: Number.isFinite(scoreLeft) ? Math.max(0, before - scoreLeft) : 0 };
    });
};
export const startingScoreOf = (game, playerId) => Number(own(game, playerId).startingScore ?? game?.startingScore);
export const inModeOf = (game, playerId) => own(game, playerId).legInMode ?? game?.legInMode;
export const outModeOf = (game, playerId) => own(game, playerId).legOutMode ?? game?.legOutMode;

const thrown = (darts) => darts.filter(dart => dart && String(dart).trim() !== '');

// the points of a dart as the app has always counted them ('0', 'S20', 'D25', …);
// bull 'fifty' (a club's house rule): the outer bull counts 50 as the bullseye
export const dartPoints = (dart, bull = 'split') => {
    const value = String(dart ?? '').trim().toUpperCase();
    if (value === '' || Number(value) === 0) return 0;
    const match = value.match(/^([SDT])(\d{1,2})$/);
    if (!match) return 0;
    const number = Number(match[2]);
    if (!((number >= 1 && number <= 20) || (number === 25 && match[1] !== 'T'))) return 0;
    if (number === 25 && bull === 'fifty') return 50;
    return number * { S: 1, D: 2, T: 3 }[match[1]];
};

export const visitPoints = (darts, bull = 'split') => darts.reduce((total, dart) => total + dartPoints(dart, bull), 0);

/**
 * Whether what is left after the darts of the visit so far is a bust: below
 * zero, or with double (master) out a rest of 1 or a finish on the wrong dart.
 */
export const isBust = (score, currentThrow = [], outMode = 'Double Out') => {
    if (score < 0) return true;
    const darts = thrown(currentThrow);
    const last = String(darts.at(-1) ?? '').toUpperCase();
    if (outMode === 'Double Out') return score === 1 || (score === 0 && darts.length > 0 && !last.startsWith('D'));
    if (outMode === 'Master Out') return score === 1 || (score === 0 && darts.length > 0 && !/^[DT]/.test(last));
    return false;
};

// a new player as the setup has always created them
export const newX01Player = (rules = null, startingScore) => ({
    hasWonGame: false,
    score: Number(rules?.startingScore ?? startingScore),
    setsWon: 0,
    legsWon: { game: 0 },
    currentSetLegsWon: 0,
    totalThrow: { game: { darts: 0, rounds: 0 } },
    totalThrowEndGame: { game: { darts: 0, rounds: 0 } },
    totalThrowBegMidGame: { game: { darts: 0, rounds: 0 } },
    bestThreeDarts: { game: { value: 0 } },
    hit: {},
    scoreRanges: {},
    averages: { game: { overall: 0, begMidGame: 0, endGame: 0 } },
    checkout: { game: { hit: 0, miss: 0, total: 0 }, sections: {} },
    checkoutScores: { game: {} },
    ...(rules ? Object.fromEntries(PLAYER_RULES.map(key => [key, key === 'startingScore' ? Number(rules[key]) : rules[key]])) : {}),
});

/**
 * The game before its first visit. settings: the X01 settings, with
 * "handicap" ({ [playerId]: { startingScore, legInMode, legOutMode } }) when
 * the players have rules of their own, and "starter" when not the first
 * player throws first.
 */
export const newX01State = (settings, players) => {
    // doubles: four players, all from the game's own rules (a handicap would split a team's score)
    const doubles = Boolean(settings.doubles) && players.length === 4;
    const handicap = doubles ? null : settings.handicap ?? null;
    // who throws first: the first player, unless the game says otherwise
    const starter = players.includes(settings.starter) ? settings.starter : players[0] ?? '';
    return {
        ...Object.fromEntries(X01_SETTINGS.map(key => [key, settings[key]])),
        ...(doubles ? { doubles: true } : {}),
        numberOfPlayers: players.length,
        isSoloGame: false,
        gameIsRunning: true,
        hasWinner: false,
        players: [...players],
        currentPlayerTurn: starter,
        startingPlayerSet: starter,
        startingPlayerLeg: starter,
        setsPlayed: 0,
        legsPlayed: 0,
        currentSet: 1,
        currentSetLeg: 1,
        currentThrow: ['', '', ''],
        currentLegThrows: [],
        allSetsThrows: {},
        playerModels: Object.fromEntries(players.map(id => [id, newX01Player(handicap?.[id] ?? null, settings.startingScore)])),
    };
};

// the per-game, -set and -leg entry of a figure, created as the app always did
const levels = (figure, set, leg, make) => {
    if (!figure.game) figure.game = make('game');
    if (!figure[set]) figure[set] = make('set');
    if (!figure[set][leg]) figure[set][leg] = make('leg');
    return [figure.game, figure[set], figure[set][leg]];
};
const counter = () => ({ darts: 0, rounds: 0 });

const RANGES = [[20, '1-19'], [40, '20-39'], [60, '40-59'], [80, '60-79'], [100, '80-99'], [120, '100-119'], [140, '120-139'], [160, '140-159'], [180, '160-179']];
const rangeOf = (score, busted) => {
    if (busted) return 'Busted';
    if (score === 0) return 'ZERO';
    return RANGES.find(([below]) => score < below)?.[1] ?? '180';
};

const couldCheckoutInSingle = (score) => score <= 20 && score >= 1;
const couldCheckoutInDouble = (score) => (score <= 40 && score >= 2 && score % 2 === 0) || score === 50;
const couldCheckoutInTriple = (score) => score <= 60 && score >= 3 && score % 3 === 0;

/**
 * The figures of a visit for the player at the oche: darts, rounds and the
 * running averages per game, set and leg (a bust scores 0), and the score
 * range. "before" is the score before the visit.
 */
const countVisit = (game, model, darts, points, busted) => {
    const set = `set-${game.currentSet}`;
    const leg = `leg-${game.currentSetLeg}`;
    const count = thrown(darts).length;
    const add = (figure) => levels(figure, set, leg, counter).forEach(entry => { entry.darts += count; entry.rounds += 1; });
    add(model.totalThrow);
    const begMid = model.score > 140;
    add(begMid ? model.totalThrowBegMidGame : model.totalThrowEndGame);

    const score = busted ? 0 : points;
    const [gameAvg, setAvg, legAvg] = levels(model.averages, set, leg, (level) => (
        level === 'game' ? { overall: 0, begMidGame: 0, endGame: 0 }
            : level === 'set' ? { overall: 0, begMidSet: 0, endSet: 0 }
                : { overall: 0, begMidLeg: 0, endLeg: 0 }));
    const running = (average, rounds) => (average * (rounds - 1) + score) / rounds;
    const [gameRounds, setRounds, legRounds] = [model.totalThrow.game, model.totalThrow[set], model.totalThrow[set][leg]].map(entry => entry.rounds);
    gameAvg.overall = running(gameAvg.overall, gameRounds);
    setAvg.overall = running(setAvg.overall, setRounds);
    legAvg.overall = running(legAvg.overall, legRounds);
    const part = begMid ? model.totalThrowBegMidGame : model.totalThrowEndGame;
    const [names, rounds] = [begMid ? ['begMidGame', 'begMidSet', 'begMidLeg'] : ['endGame', 'endSet', 'endLeg'], [part.game.rounds, part[set].rounds, part[set][leg].rounds]];
    [gameAvg, setAvg, legAvg].forEach((average, index) => { average[names[index]] = running(average[names[index]], rounds[index]); });

    const range = rangeOf(points, busted);
    levels(model.scoreRanges, set, leg, () => ({})).forEach(entry => { entry[range] = (entry[range] ?? 0) + 1; });
};

// the chances to check out in the visit, dart by dart, by the out mode of the player
const countCheckouts = (model, darts, outMode, set, leg, bull) => {
    let left = model.score;
    for (const dart of thrown(darts)) {
        const value = String(dart);
        const points = Number(value) === 0 ? 0 : bull === 'fifty' && /^s25$/i.test(value) ? 50 : Number(value.slice(1)) * (/^t/i.test(value) ? 3 : /^d/i.test(value) ? 2 : 1);
        const [gameEntry, setEntry, legEntry] = levels(model.checkout, set, leg, () => ({ total: 0, miss: 0, hit: 0 }));
        const count = (entries, hit) => entries.forEach(entry => { entry.total += 1; entry[hit ? 'hit' : 'miss'] += 1; });
        if (outMode === 'Double Out' && couldCheckoutInDouble(left)) {
            const hit = left - points === 0 && /^d/i.test(value);
            if (!model.checkout.sections) model.checkout.sections = {};
            const section = left / 2;
            if (!model.checkout.sections[section]) model.checkout.sections[section] = { total: 0, miss: 0, hit: 0 };
            count([model.checkout.sections[section], gameEntry, setEntry, legEntry], hit);
        } else if (outMode === 'Master Out' && (couldCheckoutInDouble(left) || couldCheckoutInTriple(left))) {
            // the set is not counted for these modes, as it never was
            count([gameEntry, legEntry], left - points === 0 && /^[dt]/i.test(value));
        } else if (outMode === 'Straight Out' && (couldCheckoutInSingle(left) || couldCheckoutInDouble(left) || couldCheckoutInTriple(left))) {
            count([gameEntry, legEntry], left - points === 0);
        }
        left -= points;
    }
};

const nextOf = (players, id) => players[(players.indexOf(id) + 1) % players.length];

/**
 * A leg won by "winnerId", by a checkout or (a club's round limit) with the
 * fewest points left: the legs and sets counted, the leg kept with its
 * visits. → { wonSet, wonGame }
 */
const winLeg = (game, winnerId, set, leg, legThrows) => {
    const model = game.playerModels[winnerId];
    game.legsPlayed += 1;
    model.legsWon = { ...model.legsWon, game: (model.legsWon?.game ?? 0) + 1, [set]: (model.legsWon?.[set] ?? 0) + 1 };
    const legsToWin = game.legMode === 'Best of' ? Math.round(game.numberOfLegs / 2) : game.numberOfLegs;
    const wonSet = model.currentSetLegsWon + 1 === legsToWin;
    let wonGame = false;
    model.currentSetLegsWon += 1;
    if (!game.allSetsThrows[set]) game.allSetsThrows[set] = {};
    game.allSetsThrows[set][leg] = legThrows;
    if (wonSet) {
        const setsToWin = game.setMode === 'Best of' ? Math.round(game.numberOfSets / 2) : game.numberOfSets;
        wonGame = model.setsWon + 1 === setsToWin;
        if (!wonGame) {
            game.currentSet += 1;
            game.currentSetLeg = 1;
        }
        game.setsPlayed += 1;
        model.setsWon += 1;
        game.players.forEach(id => Object.assign(game.playerModels[id], { currentSetLegsWon: 0, currentSetLeg: 1 }));
    } else {
        game.currentSetLeg += 1;
    }
    // doubles: the partner won the leg too
    for (const partner of partnersOf(game, winnerId)) {
        Object.assign(game.playerModels[partner], { legsWon: { ...model.legsWon }, currentSetLegsWon: model.currentSetLegsWon, setsWon: model.setsWon });
    }
    game.currentLegThrows = [];
    return { wonSet, wonGame };
};

/**
 * A club's round limit: after a full round of the leg at or past the limit,
 * the one with the fewest points left wins it; a tie plays on, round by round.
 * → the winner's id or null
 */
const roundLimitWinner = (game) => {
    const limit = Number(game.roundLimit) || 0;
    const visits = game.currentLegThrows.length;
    if (!limit || visits % game.players.length !== 0 || visits / game.players.length < limit) return null;
    // in doubles the teams compare their one score
    const sides = sidesOf(game);
    const scores = sides.map(([id]) => game.playerModels[id].score);
    const fewest = Math.min(...scores);
    return scores.filter(score => score === fewest).length === 1 ? sides[scores.indexOf(fewest)][0] : null;
};

/**
 * The game after one visit of the player at the oche: darts as entered (up to
 * three; the in mode is applied when they are entered). Changes "game" itself.
 */
export const x01Visit = (game, darts) => {
    const playerId = game.currentPlayerTurn;
    const model = game.playerModels[playerId];
    const currentThrow = [...darts, '', '', ''].slice(0, DARTS_PER_VISIT).map(dart => (dart == null ? '' : String(dart)));
    const points = visitPoints(currentThrow, game.bull);
    const scoreLeft = model.score - points;
    const outMode = outModeOf(game, playerId);
    const busted = isBust(scoreLeft, currentThrow, outMode);
    const set = `set-${game.currentSet}`;
    const leg = `leg-${game.currentSetLeg}`;
    const before = model.score;

    // who won the leg (the thrower by a checkout, or anyone by the round limit), and what it decided
    let legWinner = null;
    let wonSet = false;
    let wonGame = false;

    if (busted) {
        countVisit(game, model, currentThrow, points, true);
    } else if (scoreLeft === 0) {
        levels(model.checkoutScores, set, leg, () => ({})).forEach(entry => { entry[points] = (entry[points] ?? 0) + 1; });
        countVisit(game, model, currentThrow, points, false);
        legWinner = playerId;
        const legThrows = [...game.currentLegThrows, { darts: currentThrow, playerId, roundScore: points, scoreLeft }];
        ({ wonSet, wonGame } = winLeg(game, playerId, set, leg, legThrows));
        model.score = scoreLeft;
    } else {
        countVisit(game, model, currentThrow, points, false);
        model.score = scoreLeft;
    }
    // doubles: the team's score is one
    for (const partner of partnersOf(game, playerId)) game.playerModels[partner].score = model.score;

    const [bestGame, bestSet, bestLeg] = levels(model.bestThreeDarts, set, leg, () => ({ value: 0 }));
    [bestGame, bestSet, bestLeg].forEach(entry => { if (points > entry.value) entry.value = points; });
    for (const dart of thrown(currentThrow)) {
        const key = Number(dart) === 0 ? 'Missed' : dart.toUpperCase();
        model.hit[key] = (model.hit[key] ?? 0) + 1;
    }
    // the chances to check out count from the score before the visit
    const after = model.score;
    model.score = before;
    countCheckouts(model, currentThrow, outMode, set, leg, game.bull);
    model.score = after;

    if (!legWinner) {
        game.currentLegThrows = [...game.currentLegThrows, {
            playerId,
            darts: thrown(currentThrow),
            roundScore: points,
            // a bust keeps the score
            scoreLeft: busted ? before : before - points,
        }];
        // a club's round limit may decide the leg after the round
        const byLimit = roundLimitWinner(game);
        if (byLimit) {
            legWinner = byLimit;
            ({ wonSet, wonGame } = winLeg(game, byLimit, set, leg, game.currentLegThrows));
        }
    }
    game.currentThrow = ['', '', ''];

    if (wonGame) {
        Object.assign(game, { gameIsRunning: false, hasWinner: true, currentSet: 0, currentSetLeg: 0 });
        [legWinner, ...partnersOf(game, legWinner)].forEach(id => { game.playerModels[id].hasWonGame = true; });
        return game;
    }
    if (legWinner) game.players.forEach(id => { game.playerModels[id].score = startingScoreOf(game, id); });

    // the next leg: the next player in turn starts, or (a club's house rule, two players) the loser of the leg
    const loserStarts = game.legStarter === 'loser' && game.players.length === 2;
    if (!legWinner) {
        game.currentPlayerTurn = nextOf(game.players, playerId);
    } else if (wonSet) {
        const starter = loserStarts ? game.players.find(id => id !== legWinner) : nextOf(game.players, game.startingPlayerSet);
        Object.assign(game, { currentPlayerTurn: starter, startingPlayerLeg: starter, startingPlayerSet: starter });
    } else {
        const starter = loserStarts ? game.players.find(id => id !== legWinner) : nextOf(game.players, game.startingPlayerLeg);
        Object.assign(game, { currentPlayerTurn: starter, startingPlayerLeg: starter });
    }
    return game;
};

/**
 * X01 as a definition of the rules engine. Its players do not simply take
 * turns: a leg is started by the next player, so the game says who is next.
 */
export const X01 = {
    id: 'x01',
    minPlayers: 1,
    maxPlayers: 4,
    // a replay applies each visit to its own state
    inPlace: true,
    init: (settings, players) => newX01State(settings, players),
    visit: (state, id, darts) => x01Visit(state, darts.map(dart => dart.field ?? dart)),
    current: (state) => (state.hasWinner ? null : state.currentPlayerTurn),
    playerOf: (state, id) => state.playerModels[id],
    over: (state) => state.hasWinner,
    // the sets, then the legs of the set, then the fewest points left
    score: (player) => player.setsWon * 10000 + player.currentSetLegsWon * 1000 - player.score,
};

// the settings of a stored game: the X01 settings and the handicap
export const x01SettingsOf = (game) => ({
    ...Object.fromEntries(X01_SETTINGS.map(key => [key, game[key]])),
    ...(game.handicap ? { handicap: game.handicap } : {}),
    ...(game.doubles ? { doubles: true } : {}),
    ...(game.starter ? { starter: game.starter } : {}),
});

/**
 * The whole game from what is stored ({ settings, players, visits, … }): the
 * game as the screens and the statistics read it, with its visits.
 */
export const replayX01 = (stored) => {
    const { state } = replayGame(X01, { players: stored.players, settings: x01SettingsOf(stored), visits: stored.visits ?? [] });
    const keep = Object.fromEntries(Object.entries(stored).filter(([key]) => !(key in state)));
    return { ...keep, ...state, visits: stored.visits ?? [] };
};
