import { Router } from 'express';
import * as PublicController from '../controllers/public.controller.js';
import { getBanner } from '../controllers/banner.controller.js';

export default (app) => {
    const router = Router();

    // Open to everyone: only shows what clubs and players have made public
    router.get('/overview', PublicController.overview);
    // the banner on top of every page, e.g. for a test environment
    router.get('/banner', getBanner);

    app.use('/api/public', router);
};
