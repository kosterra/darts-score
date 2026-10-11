import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../utils/validation.js';
import { validatePlayerIds } from '../validators/game.validators.js';
import * as PlayerController from '../controllers/player.controller.js';
import { uploadProfileImage } from '../controllers/file.controller.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import { emailValidator, passwordValidator } from './auth.routes.js';

const playerValidator = [
    body('firstname')
        .trim()
        .notEmpty().withMessage('Firstname is required.')
        .isLength({ min: 3, max: 25 }).withMessage('Firstname must be between 3 and 25 characters.')
        .matches(/^[A-Za-zéèàäöü\s'-]+$/).withMessage('Firstname contains invalid characters.'),
    body('lastname')
        .trim()
        .notEmpty().withMessage('Lastname is required.')
        .isLength({ min: 3, max: 25 }).withMessage('Lastname must be between 3 and 25 characters.')
        .matches(/^[A-Za-zéèàäöü\s'-]+$/).withMessage('Lastname contains invalid characters.'),
    body('nickname')
        .trim()
        .notEmpty().withMessage('Nickname is required.')
        .isLength({ min: 3, max: 25 }).withMessage('Nickname must be between 3 and 25 characters.')
        .matches(/^[A-Za-zéèàäöü\s'-]+$/).withMessage('Nickname contains invalid characters.'),
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
            .matches(/^[A-Za-zéèàäöü\s'-]+$/).withMessage('Name contains invalid characters.'),
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

    // Find players by IDs
    router.post('/find', validatePlayerIds, validate, PlayerController.findByIds);

    // Retrieve a single player
    router.get('/:id', PlayerController.findOne);

    // Update a player (upload new image → validate → save, then drop the old image).
    // Club admins may edit everyone, players only themselves (checked in the controller).
    router.put('/:id',
        uploadProfileImage,
        playerValidator,
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

    // Give a player a login (or take it away again)
    router.put('/:id/account',
        requireClubAdmin,
        emailValidator,
        passwordValidator('password').optional({ values: 'falsy' }),
        validate,
        PlayerController.giveLogin
    );
    router.delete('/:id/account', requireClubAdmin, PlayerController.removeLogin);

    app.use('/api/players', router);
};
