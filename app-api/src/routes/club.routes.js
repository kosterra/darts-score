import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as ClubController from '../controllers/club.controller.js';
import * as ClubJoinController from '../controllers/club.join.controller.js';
import * as ClubLinkController from '../controllers/club.link.controller.js';
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
    // connections between clubs, to play shared tournaments (club admins)
    const clubId = param('id').isMongoId().withMessage('Invalid club.');
    router.get('/:id/connections', clubId, validate, ClubLinkController.list);
    router.get('/:id/connections/connectable',
        clubId,
        query('q').optional().isString().isLength({ max: 50 }).withMessage('Search with at most 50 characters.'),
        validate,
        ClubLinkController.connectable
    );
    router.post('/:id/connections',
        clubId,
        body('clubId').isMongoId().withMessage('Choose a club to connect to.'),
        validate,
        ClubLinkController.request
    );
    router.put('/:id/connections/:linkId',
        clubId,
        param('linkId').isMongoId().withMessage('Invalid connection.'),
        body('accept').isBoolean({ strict: true }).withMessage('accept must be true or false.'),
        validate,
        ClubLinkController.decide
    );
    router.delete('/:id/connections/:linkId',
        clubId,
        param('linkId').isMongoId().withMessage('Invalid connection.'),
        validate,
        ClubLinkController.remove
    );

    router.post('/', clubValidator, validate, ClubController.create);
    router.put('/:id',
        clubValidator,
        ['isPublic', 'publicLiveGames', 'publicResults', 'shameBadges', 'shameWithoutChildren', 'connectable'].map(setting =>
            body(setting).optional().isBoolean({ strict: true }).withMessage(`${setting} must be true or false.`)),
        body('joinPolicy').optional().isIn(['open', 'approval', 'closed']).withMessage('New members join freely, are accepted by an admin, or are added by the admins only.'),
        body('shameMinAge').optional().isInt({ min: 6, max: 21 }).withMessage('The age limit must be between 6 and 21.').toInt(),
        body('description').optional().isString().trim().isLength({ max: 500 }).withMessage('The description can have at most 500 characters.'),
        body('accent').optional({ values: 'null' }).isString().isLength({ max: 20 }).withMessage('Unknown colour.'),
        body('country').optional().isString().matches(/^([A-Za-z]{2}(-[A-Za-z]{3})?)?$/).withMessage('The country is a code like CH, or GB-ENG for England.'),
        body('dashboardWidgets').optional().isArray({ max: 40 }).withMessage('dashboardWidgets must be a list.'),
        body('dashboardWidgets.*').isString().matches(/^[A-Za-z0-9]{1,40}$/).withMessage('Invalid dashboard widget.'),
        body('dashboardLayout').optional().isArray({ max: 40 }).withMessage('dashboardLayout must be a list.'),
        body('dashboardLayout.*.id').isString().matches(/^[A-Za-z0-9]{1,40}$/).withMessage('Invalid dashboard widget.'),
        body('dashboardLayout.*.size').isIn(['S', 'M', 'L', 'F']).withMessage('The width of a widget is S, M, L or F.'),
        validate,
        ClubController.update
    );
    // the club shirt (club admins)
    router.put('/:id/shirt',
        param('id').isMongoId().withMessage('Invalid club.'),
        body('logo').optional().isBoolean({ strict: true }).withMessage('logo must be true or false.'),
        validate,
        ClubController.updateShirt
    );
    // the club's own rules for its games (club admins)
    router.put('/:id/game-rules',
        param('id').isMongoId().withMessage('Invalid club.'),
        body().isObject().withMessage('The game rules are an object.'),
        body('formats').optional().isArray({ max: 20 }).withMessage('A club has at most 20 formats.'),
        body('formats.*.name').optional().isString().isLength({ max: 60 }).withMessage('The name of a format can have at most 60 characters.'),
        validate,
        ClubController.updateGameRules
    );
    // the club's goals, e.g. 100 × 180 by the end of the season (club admins)
    router.put('/:id/goals',
        param('id').isMongoId().withMessage('Invalid club.'),
        body('goals').isArray({ max: 3 }).withMessage('A club has at most 3 goals.'),
        body('goals.*.metric').isString().withMessage('A goal needs what it counts.'),
        body('goals.*.target').isInt({ min: 1, max: 10000000 }).withMessage('A goal needs a number between 1 and 10,000,000.'),
        body('goals.*.until').optional({ values: 'null' }).isISO8601().withMessage('The end of a goal is a date.'),
        validate,
        ClubController.updateGoals
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
