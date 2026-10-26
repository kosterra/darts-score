import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import { validateX01Create, validatePlayerIds } from '../validators/game.validators.js';
import controller from '../controllers/x01.controller.js';
import * as ScreenController from '../controllers/screen.controller.js';

export default (app) => {
    const router = Router();
    const sendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });

    router.post('/',    validateX01Create, validate, controller.create);
    router.post('/find', validatePlayerIds, validate, controller.findByFilters);
    router.get('/',                                  controller.findAll);
    router.get('/:id',                               controller.findOne);
    router.put('/:id',  validateX01Create, validate, controller.update);
    router.delete('/:id', requireClubAdmin,                 controller.delete);
    // a link for a big screen at the club that follows the game without a login
    router.post('/:id/screen',                       ScreenController.link('x01'));
    // ... or sent to a TV by the code it shows (attempts limited: a code is six digits)
    router.post('/:id/screen/send', sendLimiter, body('code').isString().matches(/^\d{6}$/).withMessage('The code of the TV has six digits.'), validate, ScreenController.send('x01'));

    app.use('/api/games/x01', router);
};
