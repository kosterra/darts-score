import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import * as CalendarController from '../controllers/calendar.controller.js';
import * as BoardController from '../controllers/board.controller.js';
import { ATTENDANCE_ANSWERS, DAY_KEY, REASON_MAX } from '../rules/calendar.js';
import { MAX_BOARDS } from '../rules/boards.js';
import { NIGHT_KINDS, NIGHT_MAX_PLAYERS, NIGHT_SETUP_CHOICES } from '../utils/boards.js';
import { sendLimiter, tvCode } from './screen.routes.js';

// the calendar of the selected club: its members answer, its admins set the club nights
export default (app) => {
    const router = Router();
    const day = param('day').matches(DAY_KEY).withMessage('Choose a day.');

    router.get('/', CalendarController.show);
    router.put('/nights/:day/attendance', day, body('answer').optional({ values: 'null' }).isIn(ATTENDANCE_ANSWERS).withMessage('Answer yes or no.'), validate, CalendarController.attend);
    router.get('/nights/:day/evening', day, validate, CalendarController.evening);
    router.get('/feed-link', CalendarController.feedLink);
    // a club night played on boards: everyone follows it, the players of a pairing start their game
    const entry = param('entry').isMongoId().withMessage('There is no such match.');
    router.get('/nights/:day/boards', day, validate, BoardController.show);
    router.post('/nights/:day/boards/entries/:entry/start', day, entry, body('first').optional({ values: 'null' }).isMongoId(), validate, BoardController.start);
    router.post('/nights/:day/boards/screen', day, validate, BoardController.screenLink);
    router.post('/nights/:day/boards/screen/send', sendLimiter, day, tvCode, validate, BoardController.screenSend);
    router.post('/feed-link', CalendarController.feedLink);

    // the club's admins
    router.put('/nights', requireClubAdmin, body('nights').isArray({ max: 7 }).withMessage('Choose the club nights.'), validate, CalendarController.setNights);
    router.put('/nights/:day/cancelled', requireClubAdmin, day, body('reason').optional().isString().isLength({ max: REASON_MAX }), validate, CalendarController.cancel);
    router.delete('/nights/:day/cancelled', requireClubAdmin, day, validate, CalendarController.restore);
    const boardCount = (field) => body(field).isInt({ min: 0, max: MAX_BOARDS }).withMessage(`Choose 0 to ${MAX_BOARDS} boards.`).toInt();
    const setup = (key, choices) => body(`setup.${key}`).optional().isIn(choices).withMessage('Choose the game of the night.');
    router.put('/boards', requireClubAdmin, boardCount('count'), validate, BoardController.clubBoards);
    router.put('/nights/:day/boards', requireClubAdmin, day,
        boardCount('count').optional(),
        body('out').optional().isArray({ max: MAX_BOARDS }).withMessage('Choose the boards taken out.'),
        body('out.*').isInt({ min: 1, max: MAX_BOARDS }).withMessage('Choose the boards taken out.').toInt(),
        body('players').optional().isArray({ max: NIGHT_MAX_PLAYERS }).withMessage(`Choose up to ${NIGHT_MAX_PLAYERS} players.`),
        body('players.*').isMongoId().withMessage('Choose the players of the night.'),
        body('gone').optional().isArray({ max: NIGHT_MAX_PLAYERS }).withMessage('Choose who went home.'),
        body('gone.*').isMongoId().withMessage('Choose who went home.'),
        body('setup').optional().isObject().withMessage('Choose the game of the night.'),
        setup('kind', NIGHT_KINDS),
        ...Object.entries(NIGHT_SETUP_CHOICES).map(([key, choices]) => setup(key, choices)),
        validate, BoardController.save);
    router.put('/nights/:day/boards/entries/:entry', requireClubAdmin, day, entry,
        body('board').optional().isInt({ min: 1, max: MAX_BOARDS }).withMessage('Choose a board.').toInt(),
        body('held').optional().isBoolean({ strict: true }).withMessage('Hold the match back or not.').toBoolean(true),
        body('status').optional().isIn(['cancelled']).withMessage('A match can only be cancelled.'),
        body().custom(value => ['board', 'held', 'status'].filter(key => value?.[key] !== undefined).length === 1).withMessage('Change the board, hold the match back or cancel it.'),
        validate, BoardController.entry);

    app.use('/api/calendar', router);
};

// the feed of a user for the calendar of their phone, without a login
export const calendarFeedRoutes = (app) => {
    app.get('/api/calendar-feed/:token', param('token').matches(/^[0-9a-f]{48}(\.ics)?$/).withMessage('There is no such calendar.'), validate, CalendarController.feed);
};
