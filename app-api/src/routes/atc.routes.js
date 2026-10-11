import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import { validateATCCreate } from '../validators/game.validators.js';
import { create, findByQuery, del } from '../controllers/atc.controller.js';

export default (app) => {
    const router = Router();

    router.post('/',    validateATCCreate, validate, create);
    router.get('/',                                  findByQuery);
    router.delete('/:id', requireClubAdmin,          del);

    app.use('/api/training/atc', router);
};
