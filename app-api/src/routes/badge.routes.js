import { Router } from 'express';
import { BADGES, BADGE_CATEGORIES } from '../utils/badges.js';

export default (app) => {
    const router = Router();

    // All badges and their rules, independent of a club (shown on the About page)
    router.get('/', (req, res) => {
        res.json({
            categories: BADGE_CATEGORIES,
            // eslint-disable-next-line no-unused-vars
            badges: BADGES.map(({ metric, ...badge }) => badge),
        });
    });

    app.use('/api/badges', router);
};
