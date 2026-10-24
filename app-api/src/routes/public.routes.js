import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as PublicController from '../controllers/public.controller.js';
import * as QuickGameController from '../controllers/quick.game.controller.js';
import { getBanner } from '../controllers/banner.controller.js';
import { legalPage } from '../utils/legal.settings.js';

export default (app) => {
    const router = Router();

    // Open to everyone: only shows what clubs and players have made public
    router.get('/overview', PublicController.overview);
    // the banner on top of every page, e.g. for a test environment
    router.get('/banner', getBanner);
    // the privacy policy and imprint: who runs this installation, how long what is kept
    router.get('/legal', async (req, res) => res.json(await legalPage()));

    // quick games without an account: a few new ones per hour from one network,
    // and the visits of the games going on
    const starting = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
        message: { message: 'Many quick games were started from your network. Please wait a while, or create an account.' } });
    const playing = rateLimit({ windowMs: 15 * 60 * 1000, limit: 900, standardHeaders: true, legacyHeaders: false });
    const id = param('id').isMongoId().withMessage('Invalid game.');
    router.post('/quick-games', starting, body('kind').isIn(['x01', 'cricket']).withMessage('A quick game is X01 or Cricket.'), validate, QuickGameController.create);
    router.get('/quick-games/:id', playing, id, validate, QuickGameController.findOne);
    router.put('/quick-games/:id', playing, id, validate, QuickGameController.update);
    router.get('/quick-games/:id/stats', playing, id, validate, QuickGameController.stats);

    app.use('/api/public', router);
};
