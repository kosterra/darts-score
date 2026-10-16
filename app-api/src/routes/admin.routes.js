import { Router } from 'express';
import { requireGlobalAdmin } from '../middleware/auth.middleware.js';
import * as AdminController from '../controllers/admin.controller.js';

export default (app) => {
    const router = Router();

    // The administration of the whole installation is for global admins only
    router.use(requireGlobalAdmin);

    router.get('/overview', AdminController.overview);
    router.get('/clubs', AdminController.clubs);
    // players, games and trainings of the clubs in ?clubs=id1,id2
    router.get('/players', AdminController.players);
    router.get('/games', AdminController.games);
    router.get('/trainings', AdminController.trainings);

    app.use('/api/admin', router);
};
