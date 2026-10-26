import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as ScreenController from '../controllers/screen.controller.js';

/**
 * The big screen of a running game, without a login: the screen asks every
 * second or two, so the limit is generous.
 */
export default (app) => {
    const router = Router();
    const watching = rateLimit({ windowMs: 15 * 60 * 1000, limit: 2000, standardHeaders: true, legacyHeaders: false });
    router.get('/:token', watching, param('token').isString().isLength({ min: 20, max: 400 }).withMessage('Invalid link.'), validate, ScreenController.show);
    // a TV pairs itself (a few times an evening at most) and asks what to show
    const pairing = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
    router.post('/pairings', pairing, ScreenController.pair);
    router.get('/pairings/:secret', watching, param('secret').isString().isLength({ min: 20, max: 64 }).withMessage('Invalid link.'), validate, ScreenController.pairing);
    app.use('/api/screen', router);
};

// sending to a TV: a code is six digits, so the attempts are limited
const sendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });
export const tvCode = body('code').isString().matches(/^\d{6}$/).withMessage('The code of the TV has six digits.');

/**
 * The big screen of a club game, on the router of its kind: a link for a
 * laptop or tablet, and sending it to a TV by the code it shows.
 */
export const screenGameRoutes = (router, kind) => {
    router.post('/:id/screen', ScreenController.link(kind));
    router.post('/:id/screen/send', sendLimiter, tvCode, validate, ScreenController.send(kind));
};
export { sendLimiter };
