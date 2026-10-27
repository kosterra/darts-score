import { Router } from 'express';
import { screenGameRoutes } from './screen.routes.js';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import { validateEliminationCreate, validatePlayerIds } from '../validators/game.validators.js';
import controller from '../controllers/elimination.controller.js';

export default (app) => {
    const router = Router();

    router.post('/',    validateEliminationCreate, validate, controller.create);
    router.post('/find', validatePlayerIds,         validate, controller.findByFilters);
    router.get('/',                                           controller.findAll);
    router.get('/:id',                                        controller.findOne);
    router.put('/:id',  validateEliminationCreate, validate, controller.update);
    router.delete('/:id', requireClubAdmin,                 controller.delete);
    // the big screen: a link, or sent to a TV by its code
    screenGameRoutes(router, 'elimination');

    app.use('/api/games/elimination', router);
};
