import { Router } from 'express';
import { screenGameRoutes } from './screen.routes.js';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import { validateCricketCreate } from '../validators/game.validators.js';
import controller from '../controllers/cricket.controller.js';

export default (app) => {
    const router = Router();

    router.post('/',   validateCricketCreate, validate, controller.create);
    router.get('/',                                  controller.findAll);
    router.get('/:id',                               controller.findOne);
    router.put('/:id', validateCricketCreate, validate, controller.update);
    router.delete('/:id', requireClubAdmin,                 controller.delete);
    // the big screen: a link, or sent to a TV by its code
    screenGameRoutes(router, 'cricket');

    app.use('/api/games/cricket', router);
};
