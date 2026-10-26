import { Router } from 'express';
import { requireGlobalAdmin } from '../middleware/auth.middleware.js';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as AdminController from '../controllers/admin.controller.js';
import * as QuickGameController from '../controllers/quick.game.controller.js';
import * as MailTemplateController from '../controllers/mail.template.controller.js';
import * as UsageController from '../controllers/usage.controller.js';
import { getBannerSettings, updateBanner, BANNER_COLOR } from '../controllers/banner.controller.js';
import * as SecurityController from '../controllers/security.controller.js';
import * as AdminDashboardController from '../controllers/admin.dashboard.controller.js';
import * as BackupController from '../controllers/backup.controller.js';
import fs from 'node:fs/promises';
import multer from 'multer';
import logger from '../models/logger.model.js';
import { SESSION_HOURS, getSessionSettings, saveSessionSettings } from '../utils/session.settings.js';
import { GRACE_DAYS, MFA_POLICIES, getMfaSettings, isMfaEnabled, saveMfaSettings } from '../utils/mfa.js';
import { LEGAL_LIMITS, getLegalSettings, saveLegalSettings } from '../utils/legal.settings.js';
import { PROJECT_SPONSORS, SUPPORT_FIELDS, getSupportSettings, saveSupportSettings } from '../utils/support.settings.js';
import { getStartPageSettings, saveStartPageSettings } from '../utils/start.page.settings.js';
import { MAIL_LANGUAGES } from '../utils/mail.templates.js';
import { installationNumbers } from '../controllers/public.controller.js';

export default (app) => {
    const router = Router();

    // The administration of the whole installation is for global admins only
    router.use(requireGlobalAdmin);

    router.get('/overview', AdminController.overview);
    // what the global admins see first
    router.get('/dashboard', AdminDashboardController.dashboard);

    // backups of the whole installation: made by hand or on a schedule, downloaded, brought back and restored
    const backupName = param('name').matches(/^legmate-\d{8}-\d{6}-(manual|auto|before-restore|upload)\.json\.gz$/).withMessage('There is no such backup.');
    const backupUpload = multer({
        storage: multer.diskStorage({
            destination: (req, file, done) => fs.mkdir(BackupController.BACKUP_DIR, { recursive: true }).then(() => done(null, BackupController.BACKUP_DIR), done),
            filename: (req, file, done) => done(null, BackupController.backupName('upload')),
        }),
        limits: { fileSize: 4 * 1024 * 1024 * 1024 },
    });
    router.get('/backups', BackupController.list);
    router.post('/backups', BackupController.create);
    router.put('/backups/schedule',
        body('enabled').isBoolean({ strict: true }).withMessage('enabled must be true or false.'),
        body('frequency').isIn(['daily', 'weekly']).withMessage('Backups are made daily or weekly.'),
        body('hour').isInt({ min: 0, max: 23 }).toInt().withMessage('Choose an hour from 0 to 23.'),
        body('weekday').isInt({ min: 0, max: 6 }).toInt().withMessage('Choose a day of the week.'),
        body('keep').isInt({ min: BackupController.KEEP_RANGE.min, max: BackupController.KEEP_RANGE.max }).toInt().withMessage('Keep 1 to 60 backups.'),
        validate, BackupController.saveSchedule);
    router.post('/backups/upload', backupUpload.single('backup'), BackupController.uploaded);
    router.get('/backups/:name', backupName, validate, BackupController.download);
    router.delete('/backups/:name', backupName, validate, BackupController.remove);
    router.post('/backups/:name/restore', backupName, validate, BackupController.restore);
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

    // the ways to support this installation with a gift: a TWINT link and any other donation page
    router.get('/support', async (req, res) => res.json({ ...await getSupportSettings(), project: PROJECT_SPONSORS }));
    router.put('/support',
        ...SUPPORT_FIELDS.map(field => body(field).optional({ values: 'falsy' }).isURL({ protocols: ['https'], require_protocol: true }).withMessage('Enter a full address starting with https://.')),
        validate,
        async (req, res) => {
            const settings = await saveSupportSettings(req.body);
            logger.info(`Support links saved by ${req.user.email}`);
            res.json({ ...settings, project: PROJECT_SPONSORS });
        },
    );

    // who runs the installation, for the privacy policy and the imprint
    router.get('/legal', async (req, res) => res.json({ ...await getLegalSettings(), limits: LEGAL_LIMITS }));
    router.put('/legal',
        ...Object.entries(LEGAL_LIMITS).filter(([field]) => field !== 'notes').map(([field, max]) => body(field).optional().isString().isLength({ max }).withMessage(`The ${field} can have at most ${max} characters.`)),
        // the notes in each language, or one text (the English ones)
        body('notes').optional().custom(value => {
            const texts = typeof value === 'string' ? [value] : (value && typeof value === 'object' && !Array.isArray(value) ? Object.values(value) : null);
            return texts !== null && texts.every(text => typeof text === 'string' && text.length <= LEGAL_LIMITS.notes);
        }).withMessage('The notes can have at most 2000 characters.'),
        body('email').optional({ values: 'falsy' }).isEmail().withMessage('A valid email address is required.'),
        validate,
        async (req, res) => {
            const settings = await saveLegalSettings(req.body);
            logger.info(`Privacy and imprint details saved by ${req.user.email}`);
            res.json({ ...settings, limits: LEGAL_LIMITS });
        },
    );

    // what the public start page shows: the numbers of the installation, or not yet
    // with the numbers as they are now, shown or not, to decide on
    router.get('/start-page', async (req, res) => res.json({ ...await getStartPageSettings(), numbers: await installationNumbers() }));
    router.put('/start-page',
        body('showNumbers').optional().isBoolean({ strict: true }).withMessage('showNumbers must be true or false.'),
        body('publicSite').optional().isBoolean({ strict: true }).withMessage('publicSite must be true or false.'),
        validate,
        async (req, res) => {
            const changes = Object.fromEntries(['showNumbers', 'publicSite'].filter(key => typeof req.body[key] === 'boolean').map(key => [key, req.body[key]]));
            const settings = await saveStartPageSettings(changes);
            logger.info(`Start page set to ${JSON.stringify(changes)} by ${req.user.email}`);
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

    // the mail server: how it is set up, and a test mail to any address
    router.get('/mail-server', MailTemplateController.setup);
    router.put(
        '/mail-server/limit',
        body('perDay').optional({ values: 'null' }).isInt({ min: 1, max: 1000000 }).withMessage('The limit is a number from 1 to 1000000, or empty for none.'),
        validate,
        MailTemplateController.saveLimit,
    );
    router.post(
        '/mail-server/test',
        body('to').isEmail().withMessage('A valid email address is required.'),
        body('language').optional().isIn(MAIL_LANGUAGES).withMessage('Unknown language.'),
        validate,
        MailTemplateController.sendTest,
    );

    // who is logged in, ending a session, and the use of the app per week
    router.get('/sessions', UsageController.sessions);
    router.delete('/sessions/users/:id', param('id').isMongoId().withMessage('Invalid id.'), validate, UsageController.endAllOf);
    router.delete('/sessions/:id', param('id').isMongoId().withMessage('Invalid id.'), validate, UsageController.endOne);
    router.get('/usage', query('weeks').optional().isInt({ min: 1, max: 26 }).withMessage('weeks is a number from 1 to 26.'), validate, UsageController.usage);

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
