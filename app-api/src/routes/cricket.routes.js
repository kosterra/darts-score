import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { validateGameCreate } from '../validators/game.validators.js';
import controller from '../controllers/cricket.controller.js';

export default (app) => {
    const router = Router();

    router.post('/',   validateGameCreate, validate, controller.create);
    router.get('/',                                  controller.findAll);
    router.get('/:id',                               controller.findOne);
    router.put('/:id', validateGameCreate, validate, controller.update);
    router.delete('/:id',                            controller.delete);

    app.use('/api/games/cricket', router);
};
