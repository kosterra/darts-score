import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { validateX01Create, validatePlayerIds } from '../validators/game.validators.js';
import controller from '../controllers/x01.controller.js';

export default (app) => {
    const router = Router();

    router.post('/',    validateX01Create, validate, controller.create);
    router.post('/find', validatePlayerIds, validate, controller.findByFilters);
    router.get('/',                                  controller.findAll);
    router.get('/:id',                               controller.findOne);
    router.put('/:id',  validateX01Create, validate, controller.update);
    router.delete('/:id',                            controller.delete);

    app.use('/api/games/x01', router);
};
