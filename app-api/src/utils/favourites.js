import { createHash } from 'node:crypto';
import db from '../models/db.model.js';
import { GAME_SETTINGS, ruleViolations } from '../rules/club.rules.js';
import { gameOf } from '../rules/games.js';
import { withGameState } from '../rules/engine.js';
import { storedOf } from './game.view.js';
import { partnersOf, teamsOf } from '../rules/x01.js';

/**
 * A player's favourites in a club: the games they played most lately, each
 * the same game with the same settings against the same opponents, to start
 * again with one tap from their dashboard.
 */

export const FAVOURITE_DAYS = 90;
export const FAVOURITE_COUNT = 3;

const MODELS = {
    x01: () => db.x01,
    cricket: () => db.cricket,
    elimination: () => db.elimination,
    clock: () => db.clock,
    rules: () => db.rulesGame,
};
// where the app plays a game
export const pathOf = (type, kind, id) => (type === 'rules' ? `/play/${kind}/${id}` : `/${type}/${id}`);

// the settings that make a game what it is: those of the game's setup, the options of a newer game
const settingsOf = (type, game) => {
    if (type === 'rules') {
        const definition = gameOf(game.kind);
        const keys = (definition?.options ?? []).map(option => option.key);
        return Object.fromEntries(keys.filter(key => game.settings?.[key] !== undefined).map(key => [key, game.settings[key]]));
    }
    const settings = Object.fromEntries((GAME_SETTINGS[type] ?? []).map(setting => setting.key).filter(key => game[key] !== undefined).map(key => [key, game[key]]));
    // doubles stay doubles
    return type === 'x01' && teamsOf(game) ? { ...settings, doubles: true } : settings;
};

const idOf = (key) => createHash('sha256').update(key).digest('base64url').slice(0, 16);

/**
 * The favourites of a player in a club: the finished games of the last
 * FAVOURITE_DAYS days (without tournament matches, handicaps and games alone)
 * grouped by game, settings and opponents, the most played first, the more
 * recent on a tie. Opponents no longer in the club drop out.
 * → [{ id, type, kind, settings, players, opponents, count, lastAt, lastSettings }]
 */
export const favouritesOf = async (clubId, playerId, now = new Date()) => {
    const me = String(playerId);
    const since = new Date(now - FAVOURITE_DAYS * 24 * 60 * 60 * 1000);
    const groups = new Map();
    for (const [type, model] of Object.entries(MODELS)) {
        const games = await model().find(
            { club: clubId, players: me, hasWinner: true, updatedAt: { $gte: since }, 'tournament.id': { $exists: false } },
        ).lean();
        for (const game of games) {
            const players = (game.players ?? []).map(String);
            if (players.length < 2 || (game.handicap && Object.keys(game.handicap).length)) continue;
            const kind = type === 'rules' ? game.kind : null;
            const settings = settingsOf(type, game);
            const opponents = players.filter(id => id !== me).sort();
            // in doubles also with the same partner (the order of the last game keeps the teams)
            const partner = type === 'x01' ? partnersOf(game, me) : [];
            const key = JSON.stringify([type, kind, Object.entries(settings).sort(([a], [b]) => a.localeCompare(b)), opponents, partner]);
            const at = new Date(game.updatedAt);
            const group = groups.get(key) ?? { id: idOf(key), type, kind, settings, opponents, count: 0, lastAt: at, last: game };
            group.count += 1;
            if (at >= group.lastAt) Object.assign(group, { lastAt: at, last: game });
            groups.set(key, group);
        }
    }
    const members = new Set((await db.player.find({ clubs: clubId }, '_id').lean()).map(player => String(player._id)));
    return [...groups.values()]
        .filter(group => group.opponents.every(id => members.has(id)))
        .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
        .slice(0, FAVOURITE_COUNT)
        // the players in the order of the last game, and its settings (a newer game's prepared ones)
        .map(({ last, ...group }) => ({ ...group, players: (last.players ?? []).map(String), lastSettings: last.settings ?? null }));
};

/**
 * Starts a favourite again: the same game and settings against the same
 * opponents, the player who threw first last time now last. Refused when the
 * club's rules no longer allow it (the setup is the way then).
 * → { type, kind, id, path }
 */
export const startFavourite = async (club, playerId, favouriteId) => {
    const favourite = (await favouritesOf(club._id, playerId)).find(entry => entry.id === favouriteId);
    if (!favourite) throw Object.assign(new Error('This favourite is no longer there.'), { status: 404 });
    const [first, ...rest] = favourite.players;
    const players = [...rest, first];
    const { type, kind } = favourite;

    let body;
    if (type === 'rules') {
        const definition = gameOf(kind);
        if (!definition) throw Object.assign(new Error('This game is no longer there.'), { status: 404 });
        // Halve-It keeps the targets it was played with
        const options = kind === 'halveit' && favourite.lastSettings?.targetList ? { ...favourite.settings, targetList: favourite.lastSettings.targetList } : favourite.settings;
        const settings = definition.prepare ? definition.prepare(options, players) : options;
        body = withGameState(definition, { kind, players, settings, visits: [] });
        body = { kind, players, settings, visits: [], currentPlayerTurn: body.currentPlayerTurn, gameIsRunning: body.gameIsRunning, hasWinner: body.hasWinner, playerModels: body.playerModels };
    } else {
        body = storedOf(type, {
            ...favourite.settings,
            isSoloGame: false,
            players,
            currentPlayerTurn: players[0],
            ...(type === 'x01' ? { startingPlayerSet: players[0], startingPlayerLeg: players[0] } : {}),
            visits: [],
        });
    }
    const problems = ruleViolations(type === 'rules' ? kind : type, club.gameRules, body);
    if (problems.length) throw Object.assign(new Error(problems[0]), { status: 409 });
    const game = await MODELS[type]().create({ ...body, club: club._id, friendly: false });
    return { type, kind, id: String(game._id), path: pathOf(type, kind, game._id) };
};
