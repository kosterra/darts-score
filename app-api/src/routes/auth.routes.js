import { Router } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { validate } from '../utils/validation.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';
import * as AuthController from '../controllers/auth.controller.js';
import * as MfaController from '../controllers/mfa.controller.js';
import { LANGUAGES } from '../models/user.model.js';

const NAME_PATTERN = /^[\p{L}\s'-]+$/u;

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

    router.post('/register', credentialLimiter, emailValidator, nameValidators(), passwordValidator('password'), body('language').optional().isIn(LANGUAGES).withMessage('Unknown language.'), validate, AuthController.register);
    router.post('/login', credentialLimiter, emailValidator, body('password').isString().notEmpty().withMessage('Password is required.'), validate, AuthController.login);
    router.post('/logout', AuthController.logout);

    // two-step login: the code after the password, and setting it up (also while logging in)
    const codeRule = (field) => body(field).optional().isString().isLength({ max: 20 }).withMessage('Invalid code.');
    router.post('/login/mfa', credentialLimiter, codeRule('code'), codeRule('recoveryCode'), body('trust').optional().isBoolean(), validate, MfaController.loginCode);
    router.get('/mfa', requireAuth, MfaController.status);
    router.post('/mfa/setup', credentialLimiter, optionalAuth, MfaController.setup);
    router.post('/mfa/enable', credentialLimiter, optionalAuth, codeRule('code'), body('trust').optional().isBoolean(), validate, MfaController.enable);
    router.post('/mfa/disable', requireAuth, credentialLimiter, body('password').isString().notEmpty().withMessage('Current password is required.'), codeRule('code'), validate, MfaController.disable);
    router.post('/mfa/recovery-codes', requireAuth, credentialLimiter, codeRule('code'), validate, MfaController.recoveryCodes);
    router.post('/mfa/forget-devices', requireAuth, MfaController.forgetDevices);

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
    router.get('/session', requireAuth, AuthController.session);
    router.get('/players', requireAuth, AuthController.myPlayers);
    router.post('/session/extend', requireAuth, AuthController.extendSession);
    // the user's own dashboard in one of their clubs ({ layout: null } goes back to the club's)
    router.put('/dashboard/:clubId', requireAuth,
        param('clubId').isMongoId(),
        body('layout').custom(value => value === null || (Array.isArray(value) && value.length <= 40)).withMessage('layout is a list of widgets, or null.'),
        body('layout.*.id').optional().isString().matches(/^[A-Za-z0-9]{1,40}$/).withMessage('Invalid dashboard widget.'),
        body('layout.*.size').optional().isIn(['S', 'M', 'L', 'F']).withMessage('The width of a widget is S, M, L or F.'),
        validate, AuthController.setDashboard);
    // how the player likes to play (merged into what they had)
    router.put('/game-preferences', requireAuth, body().isObject().withMessage('The preferences are an object.'), validate, AuthController.setGamePreferences);
    router.put('/language', requireAuth, body('language').isIn(LANGUAGES).withMessage('Unknown language.'), validate, AuthController.setLanguage);
    router.put('/me', requireAuth, emailValidator, nameValidators(), body('startPage').optional().isIn(['dashboard', 'myStatistics']).withMessage('The start page is the dashboard or your statistics.'), body('defaultClub').optional({ values: 'null' }).isMongoId().withMessage('Choose one of your clubs.'), validate, AuthController.updateMe);
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
