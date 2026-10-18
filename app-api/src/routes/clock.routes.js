import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import { validateClockCreate, validatePlayerIds } from '../validators/game.validators.js';
import controller from '../controllers/clock.controller.js';

export default (app) => {
    const router = Router();

    router.post('/',    validateClockCreate, validate, controller.create);
    router.post('/find', validatePlayerIds,   validate, controller.findByFilters);
    router.get('/',                                     controller.findAll);
    router.get('/:id',                                  controller.findOne);
    router.put('/:id',  validateClockCreate, validate, controller.update);
    router.delete('/:id', requireClubAdmin,           controller.delete);

    app.use('/api/games/clock', router);
};
