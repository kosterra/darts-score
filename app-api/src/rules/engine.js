/**
 * The rules engine of the newer games and trainings: a game or training is
 * one definition, and every state is worked out again from the darts thrown,
 * so undo is taking the last visit away.
 *
 * A game definition:
 *   id, title, description, rules (texts), icon, minPlayers, maxPlayers
 *   options: [{ key, label, values: [{ value, label }], default }] for the setup
 *   prepare(settings, playerIds) → settings fixed when the game starts (e.g. Killer's numbers)
 *   init(settings, playerIds) → state: { players: { [id]: {...} } }
 *   visit(state, id, darts, ctx) → the state after a visit (ctx: { settings, round })
 *   active(state, id) → whether the player still throws (Killer: lives left)
 *   over(state, ctx) → whether the game is over (ctx: { settings, round, roundComplete })
 *   score(playerState) → the number that ranks the players
 *   higherIsBetter (default true)
 *   target(state, id, ctx) → what to aim at now, in words
 *   columns: [{ key, label, value(playerState, state, ctx) }] for the scoreboard
 *   figures(playerState, state) → [[label, value]] for the statistics
 *   preview(state, id, darts, ctx) → in words what the darts entered so far do
 *   current(state) → who throws next, for a game whose players do not simply take
 *     turns (X01: the next leg is started by the next player); null once it is over
 *   playerOf(state, id) → a player's part of the state (default state.players[id])
 *   stopAnyTime: a visit may end before the third dart (Golf); otherwise darts not thrown are misses
 *   progress: { label, value(playerState) } for the chart of the statistics, after every visit
 */
import { parseDart } from './darts.js';

export const DARTS_PER_VISIT = 3;

export const settingsOf = (definition, settings = {}) => ({
    ...Object.fromEntries((definition.options ?? []).map(option => [option.key, option.default])),
    ...settings,
});

const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

/**
 * The game as it stands after its visits:
 * { state, current (the player at the oche), round, visits: [{ player, darts, round }],
 *   over, standings: [{ id, score, place }] }
 */
export const replayGame = (definition, game) => {
    const settings = settingsOf(definition, game.settings);
    const order = game.players ?? [];
    let state = definition.init(settings, order);
    const active = (id) => (definition.active ? definition.active(state, id) : true);
    let index = 0;
    let round = 1;
    let over = false;
    const visits = [];

    for (const visit of game.visits ?? []) {
        if (over) break;
        const darts = (visit.darts ?? []).map(parseDart);
        state = definition.visit(clone(state), visit.player, darts, { settings, round });
        visits.push({ player: visit.player, darts: darts.map(dart => dart.field), round });
        if (definition.current) {
            over = definition.over(state, { settings, round });
            continue;
        }
        // the next player still in the game; past the last one a new round starts
        let roundComplete = false;
        for (let step = 0; step < order.length; step += 1) {
            index += 1;
            if (index >= order.length) {
                index = 0;
                round += 1;
                roundComplete = true;
            }
            if (active(order[index])) break;
        }
        over = definition.over(state, { settings, round, roundComplete });
    }

    return {
        state,
        settings,
        current: over ? null : definition.current ? definition.current(state) : order[index] ?? null,
        round,
        visits,
        over,
        standings: standingsOf(definition, state, order),
    };
};

/**
 * Each player's progress after every one of their visits, for a chart:
 * [{ round, [playerId]: value }] from round 0 (before the first visit).
 */
export const progressOf = (definition, game) => {
    const settings = settingsOf(definition, game.settings);
    const order = game.players ?? [];
    const value = (state, id) => definition.progress.value(state.players[id], state);
    let state = definition.init(settings, order);
    const after = Object.fromEntries(order.map(id => [id, [value(state, id)]]));
    const visits = game.visits ?? [];
    for (let count = 1; count <= visits.length; count += 1) {
        ({ state } = replayGame(definition, { ...game, visits: visits.slice(0, count) }));
        const { player } = visits[count - 1];
        if (after[player]) after[player].push(value(state, player));
    }
    const rounds = Math.max(0, ...order.map(id => after[id].length - 1));
    return Array.from({ length: rounds + 1 }, (_, round) => ({
        round,
        ...Object.fromEntries(order.map(id => [id, after[id][Math.min(round, after[id].length - 1)]])),
    }));
};

// a player's part of the state (X01 & co. keep them in "playerModels")
export const playerOf = (definition, state, id) => (definition.playerOf ? definition.playerOf(state, id) : state.players[id]);

/**
 * The players best first, with their place; the same score shares a place.
 */
export const standingsOf = (definition, state, order) => {
    const higher = definition.higherIsBetter !== false;
    const rows = order.map(id => ({ id, score: definition.score(playerOf(definition, state, id), state) }));
    const better = (a, b) => (higher ? a.score > b.score : a.score < b.score);
    return rows
        .map(row => ({ ...row, place: 1 + rows.filter(other => better(other, row)).length }))
        .sort((a, b) => a.place - b.place);
};

/**
 * The game with what the API keeps of its state: the player at the oche,
 * whether it is over, and per player { score, rank, hasWonGame, darts }.
 */
export const withGameState = (definition, game) => {
    const result = replayGame(definition, game);
    const darts = Object.fromEntries((game.players ?? []).map(id => [id, 0]));
    result.visits.forEach(visit => { darts[visit.player] += visit.darts.length; });
    const playerModels = Object.fromEntries(result.standings.map(row => [row.id, {
        score: row.score,
        rank: row.place,
        hasWonGame: result.over && row.place === 1,
        darts: darts[row.id],
    }]));
    return {
        ...game,
        currentPlayerTurn: result.current,
        gameIsRunning: !result.over,
        hasWinner: result.over,
        playerModels,
    };
};

/**
 * A training: one player throws until the definition says it is done.
 * A training definition:
 *   id, title, description, rules, icon, options, input: 'board' | 'hitmiss'
 *   prepare(settings) → settings fixed at the start (e.g. the random checkouts)
 *   init(settings) → state
 *   dart(state, dart, ctx) → the state after one dart (ctx: { settings })
 *   done(state, ctx) → whether the training is over
 *   target(state, ctx) → what to aim at now
 *   result(state, ctx) → { score, ...figures } once it is over (score ranks the attempts)
 *   higherIsBetter, unit, format(score)
 *   figures(result) → [[label, value]]
 *   status(state, ctx) → [[label, value]] shown while training
 * A dart for a 'hitmiss' training is 'H' or 'M'.
 */
export const replayTraining = (definition, training) => {
    const settings = settingsOf(definition, training.settings);
    let state = definition.init(settings);
    let done = false;
    let thrown = 0;
    for (const value of training.darts ?? []) {
        if (done) break;
        const dart = definition.input === 'hitmiss' ? (value === 'H' ? 'H' : 'M') : parseDart(value);
        state = definition.dart(clone(state), dart, { settings });
        thrown += 1;
        done = definition.done(state, { settings });
    }
    return { state, settings, done, thrown, result: done ? definition.result(state, { settings }) : null };
};
