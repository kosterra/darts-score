import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { validate } from '../utils/validation.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as AuthController from '../controllers/auth.controller.js';

const NAME_PATTERN = /^[A-Za-zéèàäöü\s'-]+$/;

export const emailValidator = body('email')
    .trim()
    .isEmail().withMessage('A valid email address is required.')
    .isLength({ max: 254 }).withMessage('Email is too long.')
    .toLowerCase();

// A function, because validator chains are mutable and callers add their own rules
export const nameValidators = () => ['firstname', 'lastname'].map(field => {
    const label = field.charAt(0).toUpperCase() + field.slice(1);
    return body(field)
        .trim()
        .notEmpty().withMessage(`${label} is required.`)
        .isLength({ min: 2, max: 25 }).withMessage(`${label} must be between 2 and 25 characters.`)
        .matches(NAME_PATTERN).withMessage(`${label} contains invalid characters.`);
});

export const passwordValidator = (field) => body(field)
    .isString()
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.');

// Slows down password guessing and mass sign-ups
const credentialLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again later.' },
});

export default (app) => {
    const router = Router();

    router.post('/register', credentialLimiter, emailValidator, nameValidators(), passwordValidator('password'), validate, AuthController.register);
    router.post('/login', credentialLimiter, emailValidator, body('password').isString().notEmpty().withMessage('Password is required.'), validate, AuthController.login);
    router.post('/logout', AuthController.logout);

    router.get('/config', AuthController.config);
    router.post('/forgot-password', credentialLimiter, emailValidator, validate, AuthController.forgotPassword);
    router.post('/reset-password',
        credentialLimiter,
        body('token').isString().isLength({ min: 20, max: 200 }).withMessage('Invalid link.'),
        passwordValidator('password'),
        validate,
        AuthController.resetPassword
    );

    router.get('/me', requireAuth, AuthController.me);
    router.put('/me', requireAuth, emailValidator, nameValidators(), validate, AuthController.updateMe);
    router.put('/password',
        requireAuth,
        credentialLimiter,
        body('currentPassword').isString().notEmpty().withMessage('Current password is required.'),
        passwordValidator('newPassword'),
        validate,
        AuthController.changePassword
    );

    app.use('/api/auth', router);
};
