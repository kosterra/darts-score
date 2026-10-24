import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { ROLES } from '../models/user.model.js';
import { requireGlobalAdmin } from '../middleware/auth.middleware.js';
import * as UserController from '../controllers/user.controller.js';
import { resetForUser } from '../controllers/mfa.controller.js';
import { emailValidator, nameValidators, passwordValidator } from './auth.routes.js';

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

    // helping users who cannot help themselves, e.g. with an email address that does not exist
    router.put('/:id', idValidator, emailValidator, nameValidators(), validate, UserController.update);
    router.put('/:id/password', idValidator, passwordValidator('password'), validate, UserController.setPassword);
    router.post('/:id/password-link', idValidator, validate, UserController.passwordLink);
    // a lost phone: two-step login off, set up again at the next login
    router.post('/:id/mfa/reset', idValidator, validate, resetForUser);

    app.use('/api/users', router);
};
