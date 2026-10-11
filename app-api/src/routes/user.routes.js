import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { ROLES } from '../models/user.model.js';
import { requireGlobalAdmin } from '../middleware/auth.middleware.js';
import * as UserController from '../controllers/user.controller.js';

const idValidator = param('id').isMongoId().withMessage('Invalid user id.');

export default (app) => {
    const router = Router();

    // User administration is for global admins only
    router.use(requireGlobalAdmin);

    router.get('/', UserController.findAll);
    router.put('/:id/role',
        idValidator,
        body('role').isIn(Object.values(ROLES)).withMessage(`role must be one of: ${Object.values(ROLES).join(', ')}.`),
        validate,
        UserController.updateRole
    );
    router.delete('/:id', idValidator, validate, UserController.remove);

    app.use('/api/users', router);
};
