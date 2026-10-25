import 'dotenv/config';

import express      from 'express';
import path         from 'path';
import favicon      from 'serve-favicon';
import cookieParser from 'cookie-parser';
import cors         from 'cors';
import rateLimit    from 'express-rate-limit';
import swaggerUi    from 'swagger-ui-express';
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
import eveningRoutes, { eveningClubRoutes } from './src/routes/evening.routes.js';
import { isAllowedOrigin } from './src/utils/origin.utils.js';
import { checkImageFolder } from './src/controllers/file.controller.js';
import { requireAuth, requireClub } from './src/middleware/auth.middleware.js';
import { getSessionSecret } from './src/utils/auth.utils.js';
import { bootstrap } from './src/utils/bootstrap.js';
import { startErrorLog } from './src/utils/error.log.js';
import { startNotificationJobs } from './src/utils/notification.jobs.js';
import { clientIp } from './src/utils/spam.guard.js';
import { getAppUrl } from './src/utils/mail.utils.js';
import { languageOfHeader, metaOf, renderIndex, robotsOf, sitemapOf } from './src/utils/page.meta.js';

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

// The address of the client is needed by the spam rules. Behind a reverse
// proxy it comes from X-Forwarded-For, trusted from proxies on the local or
// private network (Docker, a proxy on the same server) unless TRUST_PROXY says otherwise.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
// The app and the API share one address in production, and browsers send an
// Origin header on same-origin POSTs too, so the app's own address is allowed
// besides APP_URL and UI_URL (a UI running on its own address)
const allowedOrigins = [UI_URL, process.env.APP_URL].filter(Boolean);
app.use(cors((req, callback) => {
    const origin = req.get('origin');
    if (isAllowedOrigin({ origin, host: req.get('host'), forwardedHost: req.get('x-forwarded-host'), allowedOrigins })) {
        callback(null, { origin: true, optionsSuccessStatus: 200 });
    } else {
        logger.warn(`CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    }
}));

// ---------------------------------------------------------------------------
// Rate limiting — 100k req / 15 min (effectively disabled; tune as needed)
// ---------------------------------------------------------------------------
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100_000,
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
app.get('/sitemap.xml', (req, res) => res.type('application/xml').send(sitemapOf(baseOf(req))));
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
        return bootstrap().catch(err => logger.error(err, 'Startup bootstrap failed'));
    })
    .catch(err => {
        logger.error(err, 'Cannot connect to MongoDB');
        process.exit(1);
    });

// ---------------------------------------------------------------------------
// Swagger UI — served at /api-docs, and at the root when there is no UI build
// ---------------------------------------------------------------------------
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerDocument));
if (!HAS_UI) {
    app.use('/', swaggerUi.serve);
    app.get('/', swaggerUi.setup(swaggerDocument));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// Unauthenticated liveness probe for container health checks
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

authRoutes(app);
publicRoutes(app);
unsubscribeRoutes(app);
claimInfoRoutes(app);
tournamentReplyRoutes(app);
eveningRoutes(app);
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
app.use(['/api/players', '/api/games', '/api/training', '/api/stats', '/api/tournaments'], requireClub);
playerRoutes(app);
statsRoutes(app);
deletionRequestRoutes(app);
tournamentRoutes(app);
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
        const meta = metaOf(req.path, language, { evening });
        res.set('Cache-Control', 'no-cache');
        res.type('html').send(renderIndex(indexHtml, meta, { base: baseOf(req), path: req.path, language }));
    } catch (err) {
        logger.error(err, 'Failed to serve the app');
        res.status(500).send('Oche could not be loaded. Please try again in a moment.');
    }
});

// ---------------------------------------------------------------------------
// Global error handler  (needs all 4 params so Express recognises it)
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
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
    server.close(() => {
        db.mongoose.connection.close(false, () => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        });
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
