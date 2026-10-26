import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { sendLimiter, tvCode } from './screen.routes.js';
import * as EveningController from '../controllers/evening.controller.js';

const id = param('id').isMongoId().withMessage('Invalid evening.');

// darts evenings without an account: a few new ones per hour from one network, their games and the shared view
export default (app) => {
    const router = Router();
    const starting = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
        message: { message: 'Many evenings were started from your network. Please wait a while, or create an account.' } });
    // an evening plays many games, but not hundreds an hour
    const games = rateLimit({ windowMs: 60 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
        message: { message: 'Many games were started from your network. Please wait a while.' } });
    const reading = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false });

    router.post('/', starting, EveningController.create);
    router.get('/shared/:token', reading, param('token').matches(/^[A-Za-z0-9_-]{8,40}$/).withMessage('Invalid link.'), validate, EveningController.shared);
    router.get('/:id', reading, id, validate, EveningController.findOne);
    // the big screen of the evening (the browser that runs it): a link, or sent to a TV by its code
    router.post('/:id/screen', games, id, validate, EveningController.screenLink);
    router.post('/:id/screen/send', sendLimiter, id, tvCode, validate, EveningController.screenSend);
    router.post('/:id/games', games, id, body('kind').isIn(['x01', 'cricket', 'elimination']).withMessage('A game of the evening is X01, Cricket or Elimination.'), validate, EveningController.addGame);

    app.use('/api/public/evenings', router);
};

// for a logged-in user: the evening becomes their club
export const eveningClubRoutes = (app) => {
    app.post('/api/evenings/:id/club', id, body('name').isString().trim().isLength({ min: 1, max: 60 }).withMessage('Give the club a name of at most 60 characters.'), body('me').optional({ values: 'null' }).matches(/^q[1-8]$/).withMessage('Choose one of the players of the evening.'), validate, EveningController.adopt);
};
