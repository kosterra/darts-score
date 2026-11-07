import { LEVELS, atcTrainingLevelOf, gameLevelOf, judgeLevel } from '../rules/levels.play.js';
import { replayGame, replayTraining } from '../rules/engine.js';
import { gameOf } from '../rules/games.js';
import { trainingOf } from '../rules/trainings.js';
import { withView } from './game.view.js';

/**
 * The level every player played a game or a training at, as the result page
 * of the app shows it (rules/levels.play.js, the app's copy), kept with the
 * game or training for the lists and their filter by level:
 * [{ player, level: one of LEVELS, 'beginner' to 'elite' }], only the
 * players with enough darts to judge.
 */

export { LEVELS };

// the bot of the X01 trainings is no player of the club
const BOT_ID = 'bot';

const plain = (doc) => (typeof doc?.toObject === 'function' ? doc.toObject() : doc);
const entry = (player, judged) => (judged?.level ? [{ player: String(player), level: judged.level }] : []);
const VIEW_TYPES = ['x01', 'x01training', 'cricket', 'elimination', 'clock'];

/**
 * A game, by its type: 'x01', 'x01training', 'cricket', 'elimination',
 * 'clock' (as stored, with or without what follows from its visits) or a game
 * of the rules engine ('rules' or its kind; the kind is in the game).
 */
export const gamePlayLevels = (type, doc) => {
    const game = plain(doc);
    if (!game) return [];
    try {
        if (VIEW_TYPES.includes(type)) {
            const view = withView(type, game);
            return (game.players ?? []).filter(id => id !== BOT_ID).flatMap(id => entry(id, gameLevelOf(type, view, id)));
        }
        const definition = gameOf(type === 'rules' ? game.kind : type);
        if (!definition?.level) return [];
        const replay = replayGame(definition, game);
        return (game.players ?? []).flatMap(id => entry(id, replay.state.players?.[id] ? judgeLevel(definition.level, replay.state.players[id], replay.state, replay.settings) : null));
    } catch {
        // a game the rules cannot replay has no level; saving it goes on
        return [];
    }
};

/**
 * A training of the rules engine (Bob's 27, …): replayed from its darts, so
 * its result and settings are those the app showed.
 */
export const rulesTrainingPlayLevels = (doc) => {
    const training = plain(doc);
    const definition = trainingOf(training?.kind);
    if (!definition?.level || !training.player?.id) return [];
    try {
        const replayed = replayTraining(definition, { settings: training.settings ?? {}, darts: training.darts ?? [] });
        if (!replayed.done) return [];
        return entry(training.player.id, judgeLevel(definition.level, replayed.result, replayed.settings));
    } catch {
        return [];
    }
};

/**
 * An Around the Clock training: only with the fewest darts (a time says
 * nothing of the hit rate).
 */
export const atcPlayLevels = (doc) => {
    const training = plain(doc);
    return training?.player?.id ? entry(training.player.id, atcTrainingLevelOf(training)) : [];
};

// what is kept of a level by kind of document, for the migration
export const PLAY_LEVEL_KINDS = {
    x01: (doc) => gamePlayLevels('x01', doc),
    cricket: (doc) => gamePlayLevels('cricket', doc),
    elimination: (doc) => gamePlayLevels('elimination', doc),
    clock: (doc) => gamePlayLevels('clock', doc),
    rulesGame: (doc) => gamePlayLevels('rules', doc),
    x01Training: (doc) => gamePlayLevels('x01training', doc),
    rulesTraining: rulesTrainingPlayLevels,
    atc: atcPlayLevels,
};

/**
 * What is stored of a game or training with the levels it was played at, by
 * the kind of document (a key of PLAY_LEVEL_KINDS): every save goes through
 * here, so what the app sent of them is never taken.
 */
export const withPlayLevels = (kind, doc) => ({ ...doc, playLevels: PLAY_LEVEL_KINDS[kind]?.(doc) ?? [] });

// the kind of document of a game by its type (x01, cricket, …, or a kind of the rules engine)
export const levelKindOf = (type) => ({ x01: 'x01', cricket: 'cricket', elimination: 'elimination', clock: 'clock', x01training: 'x01Training' })[type] ?? 'rulesGame';

/**
 * The filter of a list by level, from the query string: { level, player? }, or
 * null when there is none (or it is not a level). With a player: the games
 * where that player played at that level, else where anyone did.
 */
export const levelFilterOf = (query = {}) => {
    const level = typeof query.level === 'string' ? query.level : '';
    if (!LEVELS.includes(level)) return null;
    const player = typeof query.player === 'string' && /^[a-f\d]{24}$/i.test(query.player) ? query.player : null;
    return player ? { playLevels: { $elemMatch: { player, level } } } : { 'playLevels.level': level };
};
