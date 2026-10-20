import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as ClubController from '../controllers/club.controller.js';
import { emailValidator, nameValidators, passwordValidator } from './auth.routes.js';
import { uploadClubLogo } from '../controllers/file.controller.js';

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
    router.put('/:id',
        clubValidator,
        ['isPublic', 'publicLiveGames', 'publicResults', 'shameBadges', 'shameWithoutChildren'].map(setting =>
            body(setting).optional().isBoolean({ strict: true }).withMessage(`${setting} must be true or false.`)),
        body('shameMinAge').optional().isInt({ min: 6, max: 21 }).withMessage('The age limit must be between 6 and 21.').toInt(),
        body('description').optional().isString().trim().isLength({ max: 500 }).withMessage('The description can have at most 500 characters.'),
        body('dashboardWidgets').optional().isArray({ max: 40 }).withMessage('dashboardWidgets must be a list.'),
        body('dashboardWidgets.*').isString().matches(/^[A-Za-z0-9]{1,40}$/).withMessage('Invalid dashboard widget.'),
        body('dashboardLayout').optional().isArray({ max: 40 }).withMessage('dashboardLayout must be a list.'),
        body('dashboardLayout.*.id').isString().matches(/^[A-Za-z0-9]{1,40}$/).withMessage('Invalid dashboard widget.'),
        body('dashboardLayout.*.size').isIn(['S', 'M', 'L', 'F']).withMessage('The width of a widget is S, M, L or F.'),
        validate,
        ClubController.update
    );
    router.delete('/:id', ClubController.remove);

    // Club logo
    router.put('/:id/logo', uploadClubLogo, ClubController.uploadLogo);
    router.delete('/:id/logo', ClubController.removeLogo);

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
