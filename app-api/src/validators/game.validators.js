import { check, body } from 'express-validator';
import { DART, GAME_KINDS, TRAINING_KINDS } from '../utils/rules.kinds.js';

const VALID_PLAYER_COUNTS = [1, 2, 3, 4];
const VALID_SET_LEG_MODES = ['Best of', 'First to'];
const VALID_IN_MODES  = ['Straight In', 'Double In', 'Master In'];
const VALID_OUT_MODES = ['Straight Out', 'Double Out', 'Master Out'];
const VALID_X01_SCORES = [101, 170, 201, 301, 401, 501, 601, 701, 801, 901, 1001];

const validateNumberOfPlayers = check('numberOfPlayers')
    .isIn(VALID_PLAYER_COUNTS)
    .withMessage('numberOfPlayers must be 1, 2, 3 or 4.');

const validatePlayers = body('players')
    .isArray({ min: 1 })
    .withMessage('players must be a non-empty array.')
    .custom((players, { req }) => {
        const n = req.body.numberOfPlayers;
        if (n && players.length !== n) {
            throw new Error(`players array length must equal numberOfPlayers (${n}).`);
        }
        return true;
    });

const validateX01StartingScore = check('startingScore')
    .isIn(VALID_X01_SCORES)
    .withMessage(`startingScore must be one of: ${VALID_X01_SCORES.join(', ')}.`);

// a handicap: players may have their own starting score and in/out mode
const validateX01Handicaps = body('playerModels')
    .optional()
    .custom((playerModels) => {
        if (typeof playerModels !== 'object' || Array.isArray(playerModels)) throw new Error('playerModels must be an object.');
        for (const model of Object.values(playerModels)) {
            if (model?.startingScore != null && !VALID_X01_SCORES.includes(Number(model.startingScore))) {
                throw new Error(`A player's startingScore must be one of: ${VALID_X01_SCORES.join(', ')}.`);
            }
            if (model?.legInMode != null && !VALID_IN_MODES.includes(model.legInMode)) {
                throw new Error(`A player's legInMode must be one of: ${VALID_IN_MODES.join(', ')}.`);
            }
            if (model?.legOutMode != null && !VALID_OUT_MODES.includes(model.legOutMode)) {
                throw new Error(`A player's legOutMode must be one of: ${VALID_OUT_MODES.join(', ')}.`);
            }
        }
        return true;
    });

// the players' own rules of a handicap, also as "handicap": { [playerId]: { startingScore, legInMode, legOutMode } }
const validateX01Handicap = body('handicap')
    .optional({ values: 'null' })
    .custom((handicap) => {
        if (typeof handicap !== 'object' || Array.isArray(handicap)) throw new Error('handicap must be an object.');
        for (const rules of Object.values(handicap)) {
            if (!VALID_X01_SCORES.includes(Number(rules?.startingScore))) throw new Error(`A player's startingScore must be one of: ${VALID_X01_SCORES.join(', ')}.`);
            if (!VALID_IN_MODES.includes(rules?.legInMode)) throw new Error(`A player's legInMode must be one of: ${VALID_IN_MODES.join(', ')}.`);
            if (!VALID_OUT_MODES.includes(rules?.legOutMode)) throw new Error(`A player's legOutMode must be one of: ${VALID_OUT_MODES.join(', ')}.`);
        }
        return true;
    });

// doubles: four players in two teams, all from the game's own rules
const validateX01Doubles = body('doubles')
    .optional({ values: 'null' })
    .isBoolean({ strict: true }).withMessage('doubles must be true or false.')
    .bail()
    .custom((doubles, { req }) => {
        if (!doubles) return true;
        if (!Array.isArray(req.body.players) || req.body.players.length !== 4) throw new Error('Doubles are played by four players.');
        if (req.body.handicap && Object.keys(req.body.handicap).length) throw new Error('Doubles are played without a handicap.');
        return true;
    });

// the visits of X01, Cricket, Elimination and Around the Clock: the game follows from them
const VISIT_DART = /^(0|[SDT]([1-9]|1\d|20)|[SD]25)$/;
const validateVisits = body('visits')
    .optional()
    .isArray({ max: 5000 }).withMessage('visits must be a list.')
    .bail()
    .custom((visits, { req }) => {
        const players = Array.isArray(req.body.players) ? req.body.players : [];
        for (const visit of visits) {
            if (!visit || typeof visit !== 'object' || !players.includes(visit.player)) throw new Error('Invalid player.');
            const darts = (visit.darts ?? []).filter(dart => dart !== '');
            if (!Array.isArray(visit.darts) || darts.length > 3) throw new Error('A visit has at most three darts.');
            if (!darts.every(dart => VISIT_DART.test(String(dart)))) throw new Error('Invalid dart.');
        }
        return true;
    });

const validateNumberOfSets = check('numberOfSets')
    .isInt({ min: 1 })
    .withMessage('numberOfSets must be a positive integer.');

const validateNumberOfLegs = check('numberOfLegs')
    .isInt({ min: 1 })
    .withMessage('numberOfLegs must be a positive integer.');

// whether the darts fly onto the board in a game with a board to tap
const validateFlyingDarts = check('flyingDarts').optional().isIn(['players', 'on', 'off']).withMessage('flyingDarts must be players, on or off.');

export const validateX01Create = [
    validateX01StartingScore,
    check('setMode').isIn(VALID_SET_LEG_MODES).withMessage(`setMode must be one of: ${VALID_SET_LEG_MODES.join(', ')}.`),
    check('legMode').isIn(VALID_SET_LEG_MODES).withMessage(`legMode must be one of: ${VALID_SET_LEG_MODES.join(', ')}.`),
    check('legInMode').isIn(VALID_IN_MODES).withMessage(`legInMode must be one of: ${VALID_IN_MODES.join(', ')}.`),
    check('legOutMode').isIn(VALID_OUT_MODES).withMessage(`legOutMode must be one of: ${VALID_OUT_MODES.join(', ')}.`),
    validateNumberOfSets,
    validateNumberOfLegs,
    validateNumberOfPlayers,
    validatePlayers,
    validateX01Handicaps,
    validateX01Handicap,
    validateX01Doubles,
    validateVisits,
    validateFlyingDarts,
];

export const validateEliminationCreate = [
    check('targetScore').isInt({ min: 1 }).withMessage('targetScore must be a positive integer.'),
    check('gameInMode').isIn(VALID_IN_MODES).withMessage(`gameInMode must be one of: ${VALID_IN_MODES.join(', ')}.`),
    check('gameOutMode').isIn(VALID_OUT_MODES).withMessage(`gameOutMode must be one of: ${VALID_OUT_MODES.join(', ')}.`),
    validateNumberOfPlayers,
    validatePlayers,
    validateVisits,
    validateFlyingDarts,
];

const VALID_CLOCK_MODES = ['Single', 'Double', 'Triple', 'All'];

export const validateClockCreate = [
    check('mode').isIn(VALID_CLOCK_MODES).withMessage(`mode must be one of: ${VALID_CLOCK_MODES.join(', ')}.`),
    check('skipAhead').optional().isBoolean().withMessage('skipAhead must be true or false.'),
    check('numberOfPlayers').isIn([2, 3, 4]).withMessage('numberOfPlayers must be 2, 3 or 4.'),
    validatePlayers,
    validateVisits,
];

export const validateGameCreate = [
    validateNumberOfPlayers,
    validatePlayers,
];

const VALID_CRICKET_VARIANTS = ['Standard', 'Cut-throat', 'No-score'];

export const validateCricketCreate = [
    check('variant').optional().isIn(VALID_CRICKET_VARIANTS).withMessage(`variant must be one of: ${VALID_CRICKET_VARIANTS.join(', ')}.`),
    validateNumberOfPlayers,
    validatePlayers,
    validateVisits,
    validateFlyingDarts,
];

const VALID_ATC_MODES = ['Single', 'Double', 'Triple', 'All'];

const VALID_ATC_SCORINGS = ['Time', 'Darts'];
// 1 to 20 and the bull
export const ATC_TARGETS = 21;
const isDarts = body('scoring').equals('Darts');

// timeMs is in hundredths of a second
export const validateATCCreate = [
    check('scoring').optional().isIn(VALID_ATC_SCORINGS).withMessage(`scoring must be one of: ${VALID_ATC_SCORINGS.join(', ')}.`),
    check('timeMs').if(body('scoring').not().equals('Darts')).isInt({ min: 1 }).withMessage('timeMs must be a positive integer.'),
    check('darts').if(isDarts).isInt({ min: ATC_TARGETS }).withMessage(`darts must be at least ${ATC_TARGETS}.`),
    check('dartsPerTarget').if(isDarts)
        .isArray({ min: ATC_TARGETS, max: ATC_TARGETS }).withMessage(`dartsPerTarget must list ${ATC_TARGETS} targets.`)
        .bail()
        .custom((list, { req }) => list.every(n => Number.isInteger(n) && n >= 1) && list.reduce((sum, n) => sum + n, 0) === req.body.darts)
        .withMessage('dartsPerTarget must be at least 1 per target and add up to darts.'),
    check('session').optional().isString().isLength({ max: 64 }).withMessage('session must be a short text.'),
    check('mode').isIn(VALID_ATC_MODES).withMessage(`mode must be one of: ${VALID_ATC_MODES.join(', ')}.`),
    check('player.id').isMongoId().withMessage('player.id must be a player id.'),
];

export const validatePlayerIds = [
    body('playerIds')
        .isArray({ min: 1 })
        .withMessage('playerIds must be a non-empty array.')
        // the entries are only checked once it is a list
        .bail()
        .custom((ids) => {
            if (!ids.every(id => typeof id === 'string' && id.trim().length > 0)) {
                throw new Error('Each playerIds entry must be a non-empty string.');
            }
            return true;
        }),
];

// the games and trainings of the rules engine: what they are, who plays and every dart
export const validateRulesGame = [
    check('kind').isIn(GAME_KINDS).withMessage(`kind must be one of: ${GAME_KINDS.join(', ')}.`),
    body('players').isArray({ min: 1, max: 8 }).withMessage('A game has 1 to 8 players.'),
    body('players.*').isMongoId().withMessage('Invalid player.'),
    body('settings').optional().isObject().withMessage('settings must be an object.'),
    body('visits').optional().isArray({ max: 2000 }).withMessage('visits must be a list.'),
    body('visits.*.player').optional().isMongoId().withMessage('Invalid player.'),
    body('visits.*.darts').optional().isArray({ max: 3 }).withMessage('A visit has at most three darts.'),
    body('visits.*.darts.*').optional().matches(DART).withMessage('Invalid dart.'),
    validateFlyingDarts,
];

export const validateRulesTraining = [
    check('kind').isIn(TRAINING_KINDS).withMessage(`kind must be one of: ${TRAINING_KINDS.join(', ')}.`),
    body('player.id').isMongoId().withMessage('player.id must be a player id.'),
    body('score').isFloat({ min: -10000, max: 100000 }).withMessage('score must be a number.'),
    body('settings').optional().isObject().withMessage('settings must be an object.'),
    body('result').optional().isObject().withMessage('result must be an object.'),
    body('darts').optional().isArray({ max: 5000 }).withMessage('darts must be a list.'),
    body('darts.*').optional().matches(DART).withMessage('Invalid dart.'),
];
