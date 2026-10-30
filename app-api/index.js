import 'dotenv/config';

import express      from 'express';
import path         from 'path';
import favicon      from 'serve-favicon';
import cookieParser from 'cookie-parser';
import cors         from 'cors';
import helmet       from 'helmet';
import rateLimit    from 'express-rate-limit';
import swaggerUi    from 'swagger-ui-express';
import { randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { load as loadYaml } from 'js-yaml';
import db           from './src/models/db.model.js';
import logger       from './src/models/logger.model.js';

const swaggerDocument = loadYaml(readFileSync(
    path.join(import.meta.dirname, 'openapi.yaml'), 'utf8'
));

import playerRoutes, { claimInfoRoutes, claimRoutes } from './src/routes/player.routes.js';
import statsRoutes     from './src/routes/stats.routes.js';
import x01Routes       from './src/routes/x01.routes.js';
import cricketRoutes   from './src/routes/cricket.routes.js';
import elimRoutes      from './src/routes/elimination.routes.js';
import clockRoutes     from './src/routes/clock.routes.js';
import { playerImageRoutes, clubLogoRoutes } from './src/routes/player.img.routes.js';
import atcRoutes       from './src/routes/atc.routes.js';
import x01TrainingRoutes from './src/routes/x01.training.routes.js';
import rulesRoutes     from './src/routes/rules.routes.js';
import authRoutes      from './src/routes/auth.routes.js';
import clubRoutes      from './src/routes/club.routes.js';
import userRoutes      from './src/routes/user.routes.js';
import adminRoutes     from './src/routes/admin.routes.js';
import publicRoutes    from './src/routes/public.routes.js';
import badgeRoutes     from './src/routes/badge.routes.js';
import integrityRoutes from './src/routes/integrity.routes.js';
import notificationRoutes, { unsubscribeRoutes } from './src/routes/notification.routes.js';
import deletionRequestRoutes from './src/routes/deletion.request.routes.js';
import tournamentRoutes, { tournamentReplyRoutes } from './src/routes/tournament.routes.js';
import leagueRoutes from './src/routes/league.routes.js';
import calendarRoutes, { calendarFeedRoutes } from './src/routes/calendar.routes.js';
import eveningRoutes, { eveningClubRoutes } from './src/routes/evening.routes.js';
import screenRoutes from './src/routes/screen.routes.js';
import { isAllowedOrigin } from './src/utils/origin.utils.js';
import { checkImageFolder } from './src/controllers/file.controller.js';
import { requireAuth, requireClub } from './src/middleware/auth.middleware.js';
import { getSessionSecret } from './src/utils/auth.utils.js';
import { bootstrap } from './src/utils/bootstrap.js';
import { startErrorLog } from './src/utils/error.log.js';
import { startNotificationJobs } from './src/utils/notification.jobs.js';
import { startBackupJobs } from './src/utils/backups.js';
import { clientIp } from './src/utils/spam.guard.js';
import { getAppUrl, startMailServerChecks } from './src/utils/mail.utils.js';
import { languageOfHeader, metaOf, renderIndex, robotsOf, sitemapOf } from './src/utils/page.meta.js';
import { getStartPageSettings } from './src/utils/start.page.settings.js';

const { UI_URL } = process.env;

logger.info(`Logger level: ${logger.level}`);
// warnings and errors are also kept for the error log of global admins
startErrorLog();

process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'Unhandled promise rejection'));
process.on('uncaughtException', (err) => {
    logger.fatal(err, 'Uncaught exception, stopping');
    // a moment to save the entry to the error log
    setTimeout(() => process.exit(1), 500).unref();
});

const app = express();

// Don't advertise the framework
app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// Security headers (helmet)
// ---------------------------------------------------------------------------
// A per-request nonce lets the one inline script in index.html (the no-flash
// theme) run under a strict script-src without opening the door to injected
// scripts; renderIndex puts the same nonce on that tag. Styles need
// 'unsafe-inline' (React sets style attributes); images allow data:/blob:
// (avatars) and the service worker needs worker-src.
app.use((req, res, next) => {
    res.locals.cspNonce = randomBytes(16).toString('base64');
    next();
});
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            workerSrc: ["'self'", 'blob:'],
            manifestSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
        },
    },
    // the app loads its own fonts and avatars; these would block legitimate cross-origin use
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // sent only over HTTPS; 180 days
    hsts: { maxAge: 15552000, includeSubDomains: true },
}));

// The address of the client is needed by the spam rules. Behind a reverse
// proxy it comes from X-Forwarded-For, trusted from proxies on the local or
// private network (Docker, a proxy on the same server) unless TRUST_PROXY says otherwise.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
// The app and the API share one address in production, and browsers send an
// Origin header on same-origin POSTs too, so the app's own address is allowed
// besides APP_URL and UI_URL (a UI running on its own address). Only the API is
// checked: the pages and files of the app are public, whoever links to them.
const allowedOrigins = [UI_URL, process.env.APP_URL].filter(Boolean);
app.use('/api', cors((req, callback) => {
    const origin = req.get('origin');
    if (isAllowedOrigin({ origin, host: req.get('host'), forwardedHost: req.get('x-forwarded-host'), allowedOrigins })) {
        callback(null, { origin: true, optionsSuccessStatus: 200 });
    } else {
        logger.warn(`CORS blocked: ${origin}`);
        callback(Object.assign(new Error('Not allowed by CORS'), { status: 403, cors: true }));
    }
}));

// ---------------------------------------------------------------------------
// Rate limiting — a generous per-IP backstop against crude floods. It is set
// high so a busy club on one network (shared NAT, the app polling live scores)
// is never caught; login, registration and the other credential endpoints
// have their own far stricter limits where it matters.
// ---------------------------------------------------------------------------
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50_000,
    standardHeaders: true,
    legacyHeaders: false
}));

// ---------------------------------------------------------------------------
// Misc middleware
// ---------------------------------------------------------------------------
app.use(favicon(path.join(import.meta.dirname, 'public', 'favicon.ico')));
app.use(cookieParser(getSessionSecret()));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(express.json({ limit: '30mb' }));

// ---------------------------------------------------------------------------
// React UI — serve static build; SPA fallback handled after API routes.
// Without a UI build (dev: the UI runs on the Vite dev server) the root serves
// Swagger UI instead and unknown paths redirect there.
// ---------------------------------------------------------------------------
const UI_DIST = path.join(import.meta.dirname, 'public', 'ui');
const HAS_UI  = existsSync(path.join(UI_DIST, 'index.html'));
// the address of the installation: as set (APP_URL), else as the request came in
const baseOf = (req) => getAppUrl() || `${req.protocol}://${req.get('host')}`;
// for the search engines: the public pages, and where to find them
app.get('/robots.txt', (req, res) => res.type('text/plain').send(robotsOf(baseOf(req))));
app.get('/sitemap.xml', async (req, res) => res.type('application/xml').send(sitemapOf(baseOf(req), await getStartPageSettings())));
// index.html is served with the meta of each page (see the SPA fallback below), the rest as it is
if (HAS_UI) app.use(express.static(UI_DIST, { index: false }));

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
// Without these the connection fails with a puzzling "undefined:undefined",
// so say plainly what is missing
const missingDbSettings = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter(name => !process.env[name]);
if (missingDbSettings.length) {
    logger.error(`Missing database settings: ${missingDbSettings.join(', ')}. Put them in the .env file next to docker-compose.yml (Portainer: the stack's environment variables, stored as stack.env).`);
    process.exit(1);
}

db.mongoose
    .connect(db.url)
    .then(() => {
        logger.info('Connected to MongoDB');
        startNotificationJobs();
        startBackupJobs();
        startMailServerChecks();
        return bootstrap().catch(err => logger.error(err, 'Startup bootstrap failed'));
    })
    .catch(err => {
        logger.error(err, 'Cannot connect to MongoDB');
        process.exit(1);
    });

// ---------------------------------------------------------------------------
// Swagger UI — served at /api-docs, and at the root when there is no UI build
// ---------------------------------------------------------------------------
// Swagger UI runs its own inline scripts and styles, so it needs a looser CSP
// than the app; it is a developer/admin page, not part of the SPA.
const swaggerCsp = (req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'");
    next();
};
app.use('/api-docs', swaggerCsp, swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerDocument));
if (!HAS_UI) {
    app.use('/', swaggerCsp, swaggerUi.serve);
    app.get('/', swaggerUi.setup(swaggerDocument));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// Unauthenticated health probe for Docker and monitoring: the database answers
// (503 while it does not) and the version running (from the OpenAPI description)
app.get('/api/health', async (req, res) => {
    let database = false;
    if (db.mongoose.connection.readyState === 1) {
        database = await db.mongoose.connection.db.admin().ping().then(() => true, () => false);
    }
    res.status(database ? 200 : 503).json({
        status: database ? 'ok' : 'unavailable',
        database: database ? 'ok' : 'unreachable',
        version: swaggerDocument?.info?.version ?? null,
        uptime: Math.round(process.uptime()),
    });
});

authRoutes(app);
publicRoutes(app);
unsubscribeRoutes(app);
claimInfoRoutes(app);
tournamentReplyRoutes(app);
calendarFeedRoutes(app);
eveningRoutes(app);
screenRoutes(app);
clubLogoRoutes(app);

// Everything else under /api needs a logged-in user ...
app.use('/api', requireAuth);
clubRoutes(app);
userRoutes(app);
adminRoutes(app);
badgeRoutes(app);
integrityRoutes(app);
notificationRoutes(app);
claimRoutes(app);
eveningClubRoutes(app);

// ... and players, games, training and statistics also need a selected club
app.use(['/api/players', '/api/games', '/api/training', '/api/stats', '/api/tournaments', '/api/leagues', '/api/calendar'], requireClub);
playerRoutes(app);
statsRoutes(app);
deletionRequestRoutes(app);
tournamentRoutes(app);
leagueRoutes(app);
calendarRoutes(app);
x01Routes(app);
cricketRoutes(app);
elimRoutes(app);
clockRoutes(app);
playerImageRoutes(app);
atcRoutes(app);
x01TrainingRoutes(app);
rulesRoutes(app);

// ---------------------------------------------------------------------------
// SPA fallback — serve index.html for all non-API routes (client-side routing);
// without a UI build, redirect them to the Swagger UI at the root
// ---------------------------------------------------------------------------
let indexHtml = null;
app.use(async (req, res) => {
    if (!HAS_UI) return res.redirect('/');
    // a file that is not there (e.g. an old script after an update) is not the app
    if (path.extname(req.path) && !req.path.endsWith('.html')) return res.status(404).json({ message: 'Not found' });
    try {
        indexHtml ??= readFileSync(path.join(UI_DIST, 'index.html'), 'utf8');
        const language = languageOfHeader(req.get('accept-language'));
        // a shared darts evening is previewed with its name
        const token = req.path.match(/^\/evening\/shared\/([A-Za-z0-9_-]{8,40})$/)?.[1];
        const evening = token ? (await db.quickEvening.findOne({ shareToken: token }, 'name').lean())?.name : undefined;
        const meta = metaOf(req.path, language, { evening, publicSite: (await getStartPageSettings()).publicSite });
        res.set('Cache-Control', 'no-cache');
        res.type('html').send(renderIndex(indexHtml, meta, { base: baseOf(req), path: req.path, language, nonce: res.locals.cspNonce }));
    } catch (err) {
        logger.error(err, 'Failed to serve the app');
        res.status(500).send('Legmate could not be loaded. Please try again in a moment.');
    }
});

// ---------------------------------------------------------------------------
// Global error handler  (needs all 4 params so Express recognises it)
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    // a request from an address that may not use the API: said once as a warning already (CORS blocked)
    if (err.cors) return res.status(403).json({ message: 'This address may not use the API.' });
    // what failed, for the error log; client mistakes (bad JSON, too large) are only warnings
    const request = { method: req.method, url: req.originalUrl, user: req.user?.email, ip: clientIp(req) };
    logger[status >= 500 ? 'error' : 'warn']({ err, request }, `${req.method} ${req.originalUrl} failed: ${err.message}`);
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message;
    res.status(status).json({ message });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    logger.info(`Server listening on ${PORT}`);
    checkImageFolder();
});

// Graceful shutdown
const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
        // Mongoose 9 closes with a promise, no callback any more
        try {
            await db.mongoose.connection.close(false);
            logger.info('MongoDB connection closed');
        } catch (err) {
            logger.error(err, 'Closing the MongoDB connection failed');
        }
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
