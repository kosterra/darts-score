import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { validateATCCreate } from '../validators/game.validators.js';
import { create, findByQuery, del } from '../controllers/atc.controller.js';

export default (app) => {
    const router = Router();

    router.post('/',    validateATCCreate, validate, create);
    router.get('/',                                  findByQuery);
    // the player's own trainings, or any as an admin of the club (checked in the controller)
    router.delete('/:id', del);

    app.use('/api/training/atc', router);
};
