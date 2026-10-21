import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as ClubController from '../controllers/club.controller.js';
import * as ClubJoinController from '../controllers/club.join.controller.js';
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

    // joining a club on one's own: the clubs that take members, asking or joining, the admins decide
    router.get('/directory',
        query('q').optional().isString().isLength({ max: 50 }).withMessage('Search with at most 50 characters.'),
        validate,
        ClubJoinController.directory
    );
    router.get('/join-requests', ClubJoinController.mine);
    router.post('/:id/join',
        param('id').isMongoId().withMessage('Invalid club.'),
        body('nickname').optional({ values: 'falsy' }).isString().trim()
            .isLength({ min: 3, max: 25 }).withMessage('Nickname must be between 3 and 25 characters.')
            .matches(/^[\p{L}\s'-]+$/u).withMessage('Nickname contains invalid characters.'),
        body('message').optional().isString().isLength({ max: 300 }).withMessage('The message is at most 300 characters.'),
        validate,
        ClubJoinController.join
    );
    router.delete('/:id/join', param('id').isMongoId().withMessage('Invalid club.'), validate, ClubJoinController.withdraw);
    router.get('/:id/join-requests', param('id').isMongoId().withMessage('Invalid club.'), validate, ClubJoinController.requestsOfClub);
    router.put('/:id/join-requests/:requestId',
        param('id').isMongoId().withMessage('Invalid club.'),
        param('requestId').isMongoId().withMessage('Invalid request.'),
        body('accept').isBoolean({ strict: true }).withMessage('accept must be true or false.'),
        validate,
        ClubJoinController.decide
    );
    router.post('/', clubValidator, validate, ClubController.create);
    router.put('/:id',
        clubValidator,
        ['isPublic', 'publicLiveGames', 'publicResults', 'shameBadges', 'shameWithoutChildren'].map(setting =>
            body(setting).optional().isBoolean({ strict: true }).withMessage(`${setting} must be true or false.`)),
        body('joinPolicy').optional().isIn(['open', 'approval', 'closed']).withMessage('New members join freely, are accepted by an admin, or are added by the admins only.'),
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
