import path from 'path';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { requireAuth, getClubRole } from '../middleware/auth.middleware.js';

const IMG_DIR = process.env.IMG_DIR || '/app/data/img';

/**
 * Sends an uploaded image of one kind (players, clubs) from IMG_DIR.
 */
const serveImage = (subdir, cacheControl) => (req, res) => {
    const filename = path.basename(req.params.filename); // prevent path traversal
    const options = {
        root: path.join(IMG_DIR, subdir),
        dotfiles: 'deny',
        headers: { 'Cache-Control': res.locals.cacheControl ?? cacheControl },
    };

    res.sendFile(filename, options, err => {
        if (err) {
            logger.error(err, `Failed to serve image: ${filename}`);
            // no next(err): a 404 lets the avatar fall back to initials
            if (!res.headersSent) res.status(404).json({ message: 'Image not found.' });
        }
    });
};

/**
 * The logo of a public club may be seen by anyone, since it shows on the
 * public start page. Logos of private clubs need a login and access to the club.
 */
const clubLogoAccess = async (req, res, next) => {
    const club = await db.club.findOne({ logo: path.basename(req.params.filename) }, 'isPublic admins').lean();
    if (!club) return res.status(404).json({ message: 'Image not found.' });
    if (club.isPublic) {
        res.locals.cacheControl = 'public, max-age=604800, immutable';
        return next();
    }
    await requireAuth(req, res, async () => {
        if (!(await getClubRole(req.user, club))) return res.status(404).json({ message: 'Image not found.' });
        next();
    });
};

// Player pictures: mounted after the login check, so only browsers cache them
export const playerImageRoutes = (app) =>
    app.get('/api/images/players/:filename', serveImage('players', 'private, max-age=604800, immutable'));

// Club logos: checked per club, see clubLogoAccess
export const clubLogoRoutes = (app) =>
    app.get('/api/images/clubs/:filename', clubLogoAccess, serveImage('clubs', 'private, max-age=604800, immutable'));
