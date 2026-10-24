import { Router } from 'express';
import { requireGlobalAdmin } from '../middleware/auth.middleware.js';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as AdminController from '../controllers/admin.controller.js';
import * as QuickGameController from '../controllers/quick.game.controller.js';
import * as MailTemplateController from '../controllers/mail.template.controller.js';
import { getBannerSettings, updateBanner, BANNER_COLOR } from '../controllers/banner.controller.js';
import * as SecurityController from '../controllers/security.controller.js';
import logger from '../models/logger.model.js';
import { SESSION_HOURS, getSessionSettings, saveSessionSettings } from '../utils/session.settings.js';
import { GRACE_DAYS, MFA_POLICIES, getMfaSettings, isMfaEnabled, saveMfaSettings } from '../utils/mfa.js';
import { getStartPageSettings, saveStartPageSettings } from '../utils/start.page.settings.js';
import { MAIL_LANGUAGES } from '../utils/mail.templates.js';
import { installationNumbers } from '../controllers/public.controller.js';

export default (app) => {
    const router = Router();

    // The administration of the whole installation is for global admins only
    router.use(requireGlobalAdmin);

    router.get('/overview', AdminController.overview);
    router.get('/clubs', AdminController.clubs);
    // the whole installation at a glance, above the lists of players, games and trainings
    router.get('/insights/players', AdminController.playersInsightsOfAll);
    router.get('/insights/games', AdminController.gamesInsights);
    router.get('/insights/trainings', AdminController.trainingsInsights);
    // players, games and trainings of the clubs in ?clubs=id1,id2
    router.get('/players', AdminController.players);
    // a player's clubs, and deleting a player from every club
    router.post('/players/:id/clubs', param('id').isMongoId(), body('club').isMongoId().withMessage('Choose a club.'), validate, AdminController.addPlayerToClub);
    router.delete('/players/:id/clubs/:clubId', param('id').isMongoId(), param('clubId').isMongoId(), validate, AdminController.removePlayerFromClub);
    router.delete('/players/:id', param('id').isMongoId(), validate, AdminController.deletePlayer);
    router.get('/games', AdminController.games);
    router.get('/trainings', AdminController.trainings);
    router.get('/x01-trainings', AdminController.x01Trainings);
    router.get('/rules-trainings', AdminController.rulesTrainings);
    // the quick games of the public start page
    router.get('/quick-games', QuickGameController.list);
    router.delete('/quick-games',
        body('ids').isArray({ min: 1, max: 500 }).withMessage('Choose the games to delete.'),
        body('ids.*').isMongoId().withMessage('Invalid game.'),
        validate,
        QuickGameController.remove,
    );

    // the banner on top of every page
    router.get('/banner', getBannerSettings);
    router.put('/banner',
        body('enabled').isBoolean().withMessage('enabled must be true or false.'),
        body('text').optional().isString().isLength({ max: 200 }).withMessage('The banner text can have at most 200 characters.'),
        body('color').matches(BANNER_COLOR).withMessage('The colour must look like #ff9900.'),
        body('text').if(body('enabled').equals('true')).trim().notEmpty().withMessage('A banner that is switched on needs a text.'),
        validate,
        updateBanner,
    );

    // how long a login lasts before it has to be extended
    router.get('/session', async (req, res) => res.json({ ...await getSessionSettings(), limits: SESSION_HOURS }));
    router.put('/session',
        body('timeoutHours').isInt({ min: SESSION_HOURS.min, max: SESSION_HOURS.max }).withMessage(`The timeout is ${SESSION_HOURS.min} to ${SESSION_HOURS.max} hours.`).toInt(),
        validate,
        async (req, res) => {
            const settings = await saveSessionSettings({ timeoutHours: req.body.timeoutHours });
            logger.info(`Session timeout set to ${settings.timeoutHours} hours by ${req.user.email}`);
            res.json({ ...settings, limits: SESSION_HOURS });
        },
    );

    // two-step login: off, optional, required for the admins or for everyone, with the days to set it up
    router.get('/mfa', async (req, res) => res.json({ ...await getMfaSettings(), policies: MFA_POLICIES, graceLimits: GRACE_DAYS, ownEnabled: isMfaEnabled(req.user) }));
    router.put('/mfa',
        body('policy').isIn(MFA_POLICIES).withMessage(`policy must be one of: ${MFA_POLICIES.join(', ')}.`),
        body('graceDays').isInt({ min: GRACE_DAYS.min, max: GRACE_DAYS.max }).withMessage(`The days to set it up are ${GRACE_DAYS.min} to ${GRACE_DAYS.max}.`).toInt(),
        validate,
        async (req, res) => {
            // so nobody locks out the installation: required only by an admin who uses it
            if ((req.body.policy === 'admins' || req.body.policy === 'everyone') && !isMfaEnabled(req.user)) {
                return res.status(409).json({ message: 'Turn on two-step login for your own account first (Profile → Account).' });
            }
            const settings = await saveMfaSettings({ policy: req.body.policy, graceDays: req.body.graceDays });
            logger.info(`Two-step login set to "${settings.policy}" (${settings.graceDays} days) by ${req.user.email}`);
            res.json({ ...settings, policies: MFA_POLICIES, graceLimits: GRACE_DAYS, ownEnabled: true });
        },
    );

    // what the public start page shows: the numbers of the installation, or not yet
    // with the numbers as they are now, shown or not, to decide on
    router.get('/start-page', async (req, res) => res.json({ ...await getStartPageSettings(), numbers: await installationNumbers() }));
    router.put('/start-page',
        body('showNumbers').isBoolean({ strict: true }).withMessage('showNumbers must be true or false.'),
        validate,
        async (req, res) => {
            const settings = await saveStartPageSettings({ showNumbers: req.body.showNumbers });
            logger.info(`Numbers on the start page ${settings.showNumbers ? 'shown' : 'hidden'} by ${req.user.email}`);
            res.json(settings);
        },
    );

    // the mails of the app: their texts, a preview and a test mail to oneself
    const templateId = param('id').isAlphanumeric().withMessage('Invalid mail.');
    const templateFields = ['subject', 'body', 'button'].map(field => body(field).isString().withMessage(`The ${field} is missing.`));
    // the texts of one language (?language=de); English without it
    const templateLanguage = query('language').optional().isIn(MAIL_LANGUAGES).withMessage('Unknown language.');
    router.get('/mail-templates', templateLanguage, validate, MailTemplateController.list);
    router.put('/mail-templates/:id', templateId, templateLanguage, templateFields, validate, MailTemplateController.save);
    router.delete('/mail-templates/:id', templateId, templateLanguage, validate, MailTemplateController.reset);
    router.post('/mail-templates/:id/preview', templateId, templateLanguage, templateFields, validate, MailTemplateController.preview);
    router.post('/mail-templates/:id/test', templateId, templateLanguage, templateFields, validate, MailTemplateController.test);

    // warnings and errors of the API
    router.get('/logs', SecurityController.logs);
    router.delete('/logs', SecurityController.clearLogs);

    // spam alerts and what the rules blocked
    const idParam = param('id').isMongoId().withMessage('Invalid id.');
    router.get('/alerts', SecurityController.alerts);
    router.get('/alerts/summary', SecurityController.alertSummary);
    router.get('/alerts/rules', SecurityController.rules);
    router.put('/alerts/resolve-all', SecurityController.resolveAllAlerts);
    router.put('/alerts/:id/resolve', idParam, validate, SecurityController.resolveAlert);
    router.put('/alerts/:id/reopen', idParam, validate, SecurityController.reopenAlert);
    router.get('/blocks', SecurityController.blocks);
    router.put('/blocks/users/:id', idParam, body('reason').optional().isString().isLength({ max: 200 }), validate, SecurityController.blockAccount);
    router.delete('/blocks/users/:id', idParam, validate, SecurityController.unblockAccount);
    router.post('/blocks/ips',
        body('ip').isString().withMessage('An address is required.'),
        body('reason').optional().isString().isLength({ max: 200 }),
        body('hours').optional({ values: 'null' }).isFloat({ min: 0, max: 24 * 365 }).withMessage('Hours must be a number.'),
        validate,
        SecurityController.blockAddress,
    );
    router.delete('/blocks/ips/:id', idParam, validate, SecurityController.unblockAddress);

    app.use('/api/admin', router);
};
