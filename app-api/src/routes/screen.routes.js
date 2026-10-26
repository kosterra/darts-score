import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { param } from 'express-validator';
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
    app.use('/api/screen', router);
};
