import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { requireClub, requireClubAdmin, requireGlobalAdmin } from '../middleware/auth.middleware.js';
import * as IntegrityController from '../controllers/integrity.controller.js';

const TYPES = ['x01', 'cricket', 'elimination', 'clock', 'training'];

export default (app) => {
    const router = Router();

    // the club of the X-Club-Id header for its admins; every club with scope=all for global admins
    const scope = (req, res, next) => req.query.scope === 'all'
        ? requireGlobalAdmin(req, res, next)
        : requireClub(req, res, () => requireClubAdmin(req, res, next));

    const target = [param('type').isIn(TYPES), param('id').isMongoId()];

    router.get('/', scope, IntegrityController.scan);
    router.put('/:type/:id/review', target, body('status').isIn(['ok', 'watch']).withMessage('The status is ok or watch.'), validate, IntegrityController.review);
    router.delete('/:type/:id', target, validate, IntegrityController.remove);

    app.use('/api/integrity', router);
};
