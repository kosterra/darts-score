import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { validatePlayerIds } from '../validators/game.validators.js';
import * as PlayerController from '../controllers/player.controller.js';
import { DOUBLES, MAIN_TREBLES } from '../utils/checkout.profile.js';
import { DART_BARRELS, FLIGHT_COLORS, FLIGHT_DESIGNS, FLIGHT_SHAPES } from '../utils/flights.js';
import { uploadProfileImage } from '../controllers/file.controller.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import { emailValidator, passwordValidator } from './auth.routes.js';

// the rules of a field, optional when a request may leave it out
const nameRule = (field, label, optional = false) => {
    const chain = optional ? body(field).optional({ values: 'falsy' }) : body(field);
    return chain
        .trim()
        .notEmpty().withMessage(`${label} is required.`)
        .isLength({ min: 3, max: 25 }).withMessage(`${label} must be between 3 and 25 characters.`)
        .matches(/^[\p{L}\s'-]+$/u).withMessage(`${label} contains invalid characters.`);
};
const birthRule = (optional = false) => (optional ? body('dateOfBirth').optional({ values: 'falsy' }) : body('dateOfBirth').notEmpty().withMessage('Date of birth is required.'))
    .bail()
    .isISO8601({ strict: true }).withMessage('Date of birth must be a date.')
    .custom((value) => {
        const date = new Date(value);
        const oldest = new Date();
        oldest.setFullYear(oldest.getFullYear() - 110);
        if (date > new Date() || date < oldest) throw new Error('Date of birth must be a day in the past.');
        return true;
    });

// an update: a player with a login sends no names (they come from the account)
// and only admins send the date of birth; the controller decides what applies
const playerUpdateValidator = [
    body('firstname').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
    body('lastname').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
    nameRule('nickname', 'Nickname', true),
    birthRule(true),
];

const playerValidator = [
    body('firstname')
        .trim()
        .notEmpty().withMessage('Firstname is required.')
        .isLength({ min: 3, max: 25 }).withMessage('Firstname must be between 3 and 25 characters.')
        .matches(/^[\p{L}\s'-]+$/u).withMessage('Firstname contains invalid characters.'),
    body('lastname')
        .trim()
        .notEmpty().withMessage('Lastname is required.')
        .isLength({ min: 3, max: 25 }).withMessage('Lastname must be between 3 and 25 characters.')
        .matches(/^[\p{L}\s'-]+$/u).withMessage('Lastname contains invalid characters.'),
    body('nickname')
        .trim()
        .notEmpty().withMessage('Nickname is required.')
        .isLength({ min: 3, max: 25 }).withMessage('Nickname must be between 3 and 25 characters.')
        .matches(/^[\p{L}\s'-]+$/u).withMessage('Nickname contains invalid characters.'),
    // a real day in the past, at most 110 years ago
    body('dateOfBirth')
        .notEmpty().withMessage('Date of birth is required.')
        .bail()
        .isISO8601({ strict: true }).withMessage('Date of birth must be a date.')
        .custom((value) => {
            const date = new Date(value);
            const oldest = new Date();
            oldest.setFullYear(oldest.getFullYear() - 110);
            if (date > new Date() || date < oldest) throw new Error('Date of birth must be a day in the past.');
            return true;
        }),
];

export default (app) => {
    const router = Router();

    // Create a new player (upload image first, then validate, then save)
    router.post('/',
        requireClubAdmin,
        uploadProfileImage,
        playerValidator,
        validate,
        PlayerController.create
    );

    // Add a guest for a game (any member of the club)
    router.post('/guest',
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required.')
            .isLength({ min: 2, max: 25 }).withMessage('Name must be between 2 and 25 characters.')
            .matches(/^[\p{L}\s'-]+$/u).withMessage('Name contains invalid characters.'),
        validate,
        PlayerController.createGuest
    );

    // Turn a guest into a regular player of the club
    router.put('/:id/member', requireClubAdmin, PlayerController.makeMember);

    // Add the logged-in user as a player of the club
    router.post('/me',
        requireClubAdmin,
        playerValidator[2],
        validate,
        PlayerController.createForCurrentUser
    );

    // Retrieve all players
    router.get('/', PlayerController.findAll);

    // Search players by name/nickname
    router.get('/search', PlayerController.findBySearchTerm);

    // When each player last played in the club
    router.get('/last-played', PlayerController.lastPlayed);

    // Find players by IDs
    router.post('/find', validatePlayerIds, validate, PlayerController.findByIds);

    // How the players of a game finish and score, for its ways out
    router.post('/checkout-profiles', validatePlayerIds, validate, PlayerController.checkoutProfiles);

    // Retrieve a single player
    router.get('/:id', PlayerController.findOne);

    // Update a player (upload new image → validate → save, then drop the old image).
    // Club admins may edit everyone, players only themselves (checked in the controller).
    router.put('/:id',
        uploadProfileImage,
        playerUpdateValidator,
        validate,
        PlayerController.update
    );

    // Delete a player and their image
    router.delete('/:id', requireClubAdmin, PlayerController.remove);

    // Show or hide a player's nickname on the public start page (admins, or the player themselves)
    router.put('/:id/visibility',
        body('publicProfile').isBoolean({ strict: true }).withMessage('publicProfile must be true or false.'),
        validate,
        PlayerController.setVisibility
    );

    // Whether the other players see a player's trainings (admins, or the player themselves)
    router.put('/:id/training-privacy',
        body('privateTrainings').isBoolean({ strict: true }).withMessage('privateTrainings must be true or false.'),
        validate,
        PlayerController.setTrainingPrivacy
    );

    // A player's favourite double and main treble, and their darts on the board (admins, or the player themselves)
    router.put('/:id/preferences',
        body('favouriteDouble').optional().isIn(['auto', ...DOUBLES]).withMessage('favouriteDouble must be auto or a double, e.g. D16.'),
        body('mainTreble').optional().isIn(['auto', ...MAIN_TREBLES]).withMessage(`mainTreble must be auto or one of ${MAIN_TREBLES.join(', ')}.`),
        body('flyingDarts').optional().isBoolean({ strict: true }).withMessage('flyingDarts must be true or false.'),
        body('flightColor').optional().isIn(['auto', ...FLIGHT_COLORS]).withMessage('flightColor must be auto or one of the flight colours.'),
        body('flightPattern').optional().isIn(FLIGHT_DESIGNS.map(design => design.id)).withMessage('flightPattern must be one of the flight designs.'),
        body('flightShape').optional().isIn(FLIGHT_SHAPES.map(shape => shape.id)).withMessage('flightShape must be one of the flight shapes.'),
        body('barrel').optional().isIn(DART_BARRELS.map(barrel => barrel.id)).withMessage('barrel must be one of the barrels.'),
        validate,
        PlayerController.setPreferences
    );

    // A player's flights: points, owned and locked shapes and designs; unlocking one
    router.get('/:id/flights', PlayerController.flights);
    router.post('/:id/flights/unlock',
        body('kind').isIn(['shape', 'design', 'barrel']).withMessage('kind must be shape, design or barrel.'),
        body('id').isString().isLength({ max: 40 }),
        validate,
        PlayerController.unlockFlight
    );

    // Give a player a login (or take it away again)
    router.put('/:id/account',
        requireClubAdmin,
        emailValidator,
        passwordValidator('password').optional({ values: 'falsy' }),
        validate,
        PlayerController.giveLogin
    );
    router.delete('/:id/account', requireClubAdmin, PlayerController.removeLogin);

    // a player's clubs: club admins of several clubs add, move and remove players between their clubs
    router.get('/:id/clubs', requireClubAdmin, PlayerController.clubsOf);
    router.post('/:id/clubs',
        requireClubAdmin,
        body('club').isMongoId().withMessage('Choose a club.'),
        body('move').optional().isBoolean().withMessage('move must be true or false.'),
        validate,
        PlayerController.addToOtherClub
    );
    router.delete('/:id/clubs/:clubId',
        requireClubAdmin,
        param('clubId').isMongoId().withMessage('Invalid club.'),
        validate,
        PlayerController.removeFromOtherClub
    );

    app.use('/api/players', router);
};
