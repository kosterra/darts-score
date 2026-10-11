import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as ClubController from '../controllers/club.controller.js';
import { emailValidator, nameValidators, passwordValidator } from './auth.routes.js';

const clubValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required.')
        .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters.'),
];

export default (app) => {
    const router = Router();

    router.get('/', ClubController.findAll);
    router.post('/', clubValidator, validate, ClubController.create);
    router.put('/:id', clubValidator, validate, ClubController.update);
    router.delete('/:id', ClubController.remove);

    // Club admins: names and password are only needed when the email has no account yet
    router.post('/:id/admins',
        emailValidator,
        nameValidators().map(validator => validator.optional({ values: 'falsy' })),
        passwordValidator('password').optional({ values: 'falsy' }),
        validate,
        ClubController.addAdmin
    );
    router.delete('/:id/admins/:userId',
        param('userId').isMongoId().withMessage('Invalid user id.'),
        validate,
        ClubController.removeAdmin
    );

    app.use('/api/clubs', router);
};
