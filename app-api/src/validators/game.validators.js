import { check, body } from 'express-validator';

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

const validateNumberOfSets = check('numberOfSets')
    .isInt({ min: 1 })
    .withMessage('numberOfSets must be a positive integer.');

const validateNumberOfLegs = check('numberOfLegs')
    .isInt({ min: 1 })
    .withMessage('numberOfLegs must be a positive integer.');

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
];

export const validateEliminationCreate = [
    check('targetScore').isInt({ min: 1 }).withMessage('targetScore must be a positive integer.'),
    check('gameInMode').isIn(VALID_IN_MODES).withMessage(`gameInMode must be one of: ${VALID_IN_MODES.join(', ')}.`),
    check('gameOutMode').isIn(VALID_OUT_MODES).withMessage(`gameOutMode must be one of: ${VALID_OUT_MODES.join(', ')}.`),
    validateNumberOfPlayers,
    validatePlayers,
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
];

const VALID_ATC_MODES = ['Single', 'Double', 'Triple', 'All'];

// timeMs is in hundredths of a second
export const validateATCCreate = [
    check('timeMs').isInt({ min: 1 }).withMessage('timeMs must be a positive integer.'),
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
