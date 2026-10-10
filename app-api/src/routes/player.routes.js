import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../utils/validation.js';
import { validatePlayerIds } from '../validators/game.validators.js';
import * as PlayerController from '../controllers/player.controller.js';
import { uploadProfileImage, deleteProfileImage } from '../controllers/file.controller.js';

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
        uploadProfileImage,
        playerValidator,
        validate,
        PlayerController.create
    );

    // Retrieve all players
    router.get('/', PlayerController.findAll);

    // Search players by name/nickname
    router.get('/search', PlayerController.findBySearchTerm);

    // Find players by IDs
    router.post('/find', validatePlayerIds, validate, PlayerController.findByIds);

    // Retrieve a single player
    router.get('/:id', PlayerController.findOne);

    // Update a player (delete old image → upload new → validate → save)
    router.put('/:id',
        deleteProfileImage,
        uploadProfileImage,
        playerValidator,
        validate,
        PlayerController.update
    );

    // Delete a player and their image
    router.delete('/:id',
        deleteProfileImage,
        PlayerController.remove
    );

    app.use('/api/players', router);
};
