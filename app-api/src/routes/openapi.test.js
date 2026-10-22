import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { load } from 'js-yaml';

// every route module, as index.js registers them
import authRoutes from './auth.routes.js';
import publicRoutes from './public.routes.js';
import clubRoutes from './club.routes.js';
import userRoutes from './user.routes.js';
import adminRoutes from './admin.routes.js';
import badgeRoutes from './badge.routes.js';
import integrityRoutes from './integrity.routes.js';
import notificationRoutes from './notification.routes.js';
import playerRoutes from './player.routes.js';
import statsRoutes from './stats.routes.js';
import deletionRequestRoutes from './deletion.request.routes.js';
import x01Routes from './x01.routes.js';
import cricketRoutes from './cricket.routes.js';
import eliminationRoutes from './elimination.routes.js';
import clockRoutes from './clock.routes.js';
import atcRoutes from './atc.routes.js';
import x01TrainingRoutes from './x01.training.routes.js';
import rulesRoutes from './rules.routes.js';
import { playerImageRoutes, clubLogoRoutes } from './player.img.routes.js';

/**
 * The routes of the API as "GET /api/players/{id}": each module registers
 * on an app that only takes notes, so nothing runs.
 */
const apiRoutes = () => {
    const found = new Set(['GET /api/health']);
    const note = (method, route) => found.add(`${method.toUpperCase()} ${route.replace(/:([A-Za-z]+)/g, '{$1}')}`);
    const app = {
        use(prefix, router) {
            for (const layer of router?.stack ?? []) {
                if (!layer.route) continue;
                for (const method of Object.keys(layer.route.methods)) note(method, prefix + (layer.route.path === '/' ? '' : layer.route.path));
            }
        },
        get: (route) => note('get', route),
        post: (route) => note('post', route),
        put: (route) => note('put', route),
        delete: (route) => note('delete', route),
    };
    [authRoutes, publicRoutes, clubRoutes, userRoutes, adminRoutes, badgeRoutes, integrityRoutes, notificationRoutes, playerRoutes, statsRoutes,
        deletionRequestRoutes, x01Routes, cricketRoutes, eliminationRoutes, clockRoutes, atcRoutes, x01TrainingRoutes, rulesRoutes, playerImageRoutes, clubLogoRoutes]
        .forEach(register => register(app));
    return found;
};

const documented = () => {
    const spec = load(readFileSync(path.join(import.meta.dirname, '../../openapi.yaml'), 'utf8'));
    return new Set(Object.entries(spec.paths).flatMap(([route, operations]) =>
        Object.keys(operations).filter(method => method !== 'parameters').map(method => `${method.toUpperCase()} ${route}`)));
};

describe('openapi.yaml', () => {
    it('documents every route of the API, and none that is gone', () => {
        const routes = apiRoutes();
        const spec = documented();
        expect([...routes].filter(route => !spec.has(route)), 'routes without documentation').toEqual([]);
        expect([...spec].filter(route => !routes.has(route)), 'documented routes the API does not have').toEqual([]);
    });
});
