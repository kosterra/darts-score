import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { reviewYears, yearReview } from '../utils/year.review.js';
import { clubYear } from '../utils/club.year.js';

// the first finished game of a player, in any game: from then on there is a year to look back at
const firstGameOf = async (playerId) => {
    const firsts = await Promise.all([db.x01, db.cricket, db.elimination, db.clock, db.rulesGame].map(model => model.findOne({ players: String(playerId), hasWinner: true }, 'createdAt').sort({ createdAt: 1 }).lean()));
    return firsts.filter(Boolean).map(game => game.createdAt).sort((a, b) => a - b)[0] ?? null;
};

/**
 * "Your year in darts" of a player: ?year (this one when left out), with the
 * years there are to look back at.
 */
export const getYearReview = async (req, res) => {
    try {
        const years = reviewYears(await firstGameOf(req.params.id));
        const asked = Number(req.query.year);
        const year = Number.isInteger(asked) && asked > 2000 && asked <= new Date().getUTCFullYear() ? asked : new Date().getUTCFullYear();
        res.json({ ...(await yearReview(req.params.id, year)), years });
    } catch (err) {
        logger.error(err, 'Failed to make the year in darts');
        res.status(500).json({ message: 'Could not look back at the year.' });
    }
};

/**
 * "The club's year" of the active club: ?year (this one when left out), with
 * the years there are to look back at, and the club's awards.
 */
export const getClubYear = async (req, res) => {
    try {
        const asked = Number(req.query.year);
        const year = Number.isInteger(asked) && asked > 2000 && asked <= new Date().getUTCFullYear() ? asked : new Date().getUTCFullYear();
        res.json(await clubYear(req.club, year));
    } catch (err) {
        logger.error(err, 'Failed to make the year of the club');
        res.status(500).json({ message: 'Could not look back at the year of the club.' });
    }
};
