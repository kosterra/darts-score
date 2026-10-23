import { Router } from 'express';
import { BADGES, BADGE_CATEGORIES, SHAME_BADGES } from '../utils/badges.js';
import { publicShameBadge } from '../controllers/badge.controller.js';
import { LEVELS, XP_RULES } from '../utils/levels.js';
import { CLUB_BADGES, CLUB_BADGE_CATEGORIES, publicClubBadge } from '../utils/club.badges.js';
import { CATALOG, FEATS, POINT_RULES, RARITIES } from '../utils/flights.js';

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
            // the badges a club earns together, in their categories
            club: { categories: CLUB_BADGE_CATEGORIES, badges: CLUB_BADGES.map(publicClubBadge) },
            // the player levels: the XP each needs (and from League Player on an X01 average), and the XP per thing
            levels: LEVELS,
            xpRules: XP_RULES,
            // the flights and barrels to collect: how the points are earned, and what each one asks for
            flights: {
                pointRules: POINT_RULES,
                rarities: RARITIES,
                items: Object.entries(CATALOG).flatMap(([kind, items]) => items.map(({ id, label, rarity, cost, level, average, feat }) => ({
                    kind, id, label, rarity, cost: cost ?? null, level: level ?? null, average: average ?? null, feat: feat ? FEATS[feat].label : null,
                }))),
            },
        });
    });

    app.use('/api/badges', router);
};
