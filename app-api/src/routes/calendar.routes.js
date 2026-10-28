import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import * as CalendarController from '../controllers/calendar.controller.js';
import { ATTENDANCE_ANSWERS, DAY_KEY, REASON_MAX } from '../rules/calendar.js';

// the calendar of the selected club: its members answer, its admins set the club nights
export default (app) => {
    const router = Router();
    const day = param('day').matches(DAY_KEY).withMessage('Choose a day.');

    router.get('/', CalendarController.show);
    router.put('/nights/:day/attendance', day, body('answer').optional({ values: 'null' }).isIn(ATTENDANCE_ANSWERS).withMessage('Answer yes or no.'), validate, CalendarController.attend);
    router.get('/nights/:day/evening', day, validate, CalendarController.evening);
    router.get('/feed-link', CalendarController.feedLink);
    router.post('/feed-link', CalendarController.feedLink);

    // the club's admins
    router.put('/nights', requireClubAdmin, body('nights').isArray({ max: 7 }).withMessage('Choose the club nights.'), validate, CalendarController.setNights);
    router.put('/nights/:day/cancelled', requireClubAdmin, day, body('reason').optional().isString().isLength({ max: REASON_MAX }), validate, CalendarController.cancel);
    router.delete('/nights/:day/cancelled', requireClubAdmin, day, validate, CalendarController.restore);

    app.use('/api/calendar', router);
};

// the feed of a user for the calendar of their phone, without a login
export const calendarFeedRoutes = (app) => {
    app.get('/api/calendar-feed/:token', param('token').matches(/^[0-9a-f]{48}(\.ics)?$/).withMessage('There is no such calendar.'), validate, CalendarController.feed);
};
