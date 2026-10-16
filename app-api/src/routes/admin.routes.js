import { Router } from 'express';
import { requireGlobalAdmin } from '../middleware/auth.middleware.js';
import { body } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as AdminController from '../controllers/admin.controller.js';
import { getBannerSettings, updateBanner, BANNER_COLOR } from '../controllers/banner.controller.js';

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

    // the banner on top of every page
    router.get('/banner', getBannerSettings);
    router.put('/banner',
        body('enabled').isBoolean().withMessage('enabled must be true or false.'),
        body('text').optional().isString().isLength({ max: 200 }).withMessage('The banner text can have at most 200 characters.'),
        body('color').matches(BANNER_COLOR).withMessage('The colour must look like #ff9900.'),
        body('text').if(body('enabled').equals('true')).trim().notEmpty().withMessage('A banner that is switched on needs a text.'),
        validate,
        updateBanner,
    );

    app.use('/api/admin', router);
};
