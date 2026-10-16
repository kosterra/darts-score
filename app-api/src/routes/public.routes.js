import { Router } from 'express';
import * as PublicController from '../controllers/public.controller.js';

export default (app) => {
    const router = Router();

    // Open to everyone: only shows what clubs and players have made public
    router.get('/overview', PublicController.overview);

    app.use('/api/public', router);
};
