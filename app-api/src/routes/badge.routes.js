import { Router } from 'express';
import { BADGES, BADGE_CATEGORIES, SHAME_BADGES } from '../utils/badges.js';
import { publicShameBadge } from '../controllers/badge.controller.js';
import { LEVELS, XP_RULES } from '../utils/levels.js';

export default (app) => {
    const router = Router();

    // All badges and their rules, and the player levels, independent of a club (shown on the About page)
    router.get('/', (req, res) => {
        res.json({
            categories: BADGE_CATEGORIES,
            // eslint-disable-next-line no-unused-vars
            badges: BADGES.map(({ metric, ...badge }) => badge),
            // the Hall of Shame: what nobody wants, and how to wash it off
            shame: SHAME_BADGES.map(publicShameBadge),
            // the player levels: the XP each needs (and from League Player on an X01 average), and the XP per thing
            levels: LEVELS,
            xpRules: XP_RULES,
        });
    });

    app.use('/api/badges', router);
};
