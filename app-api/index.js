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

import playerRoutes    from './src/routes/player.routes.js';
import statsRoutes     from './src/routes/stats.routes.js';
import x01Routes       from './src/routes/x01.routes.js';
import cricketRoutes   from './src/routes/cricket.routes.js';
import elimRoutes      from './src/routes/elimination.routes.js';
import { playerImageRoutes, clubLogoRoutes } from './src/routes/player.img.routes.js';
import atcRoutes       from './src/routes/atc.routes.js';
import authRoutes      from './src/routes/auth.routes.js';
import clubRoutes      from './src/routes/club.routes.js';
import userRoutes      from './src/routes/user.routes.js';
import publicRoutes    from './src/routes/public.routes.js';
import badgeRoutes     from './src/routes/badge.routes.js';
import { requireAuth, requireClub } from './src/middleware/auth.middleware.js';
import { getSessionSecret } from './src/utils/auth.utils.js';
import { bootstrap } from './src/utils/bootstrap.js';

const { UI_URL } = process.env;

logger.info(`Logger level: ${logger.level}`);

const app = express();

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin === UI_URL) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200
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
if (HAS_UI) app.use(express.static(UI_DIST));

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
db.mongoose
    .connect(db.url)
    .then(() => {
        logger.info('Connected to MongoDB');
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
clubLogoRoutes(app);

// Everything else under /api needs a logged-in user ...
app.use('/api', requireAuth);
clubRoutes(app);
userRoutes(app);
badgeRoutes(app);

// ... and players, games, training and statistics also need a selected club
app.use(['/api/players', '/api/games', '/api/training', '/api/stats'], requireClub);
playerRoutes(app);
statsRoutes(app);
x01Routes(app);
cricketRoutes(app);
elimRoutes(app);
playerImageRoutes(app);
atcRoutes(app);

// ---------------------------------------------------------------------------
// SPA fallback — serve index.html for all non-API routes (client-side routing);
// without a UI build, redirect them to the Swagger UI at the root
// ---------------------------------------------------------------------------
app.use((req, res) => {
    if (!HAS_UI) return res.redirect('/');
    const indexHtml = path.join(UI_DIST, 'index.html');
    res.sendFile(indexHtml, (err) => {
        if (err) res.status(404).json({ message: 'Not found' });
    });
});

// ---------------------------------------------------------------------------
// Global error handler  (needs all 4 params so Express recognises it)
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    logger.error(err);
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message;
    res.status(status).json({ message });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => logger.info(`Server listening on ${PORT}`));

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
