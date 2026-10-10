import { Router } from 'express';
import path from 'path';
import logger from '../models/logger.model.js';

const IMG_DIR = process.env.IMG_DIR || '/app/data/img';

export default (app) => {
    const router = Router();

    router.get('/:filename', (req, res) => {
        const filename = path.basename(req.params.filename); // prevent path traversal
        const options = {
            root: path.join(IMG_DIR, 'players'),
            dotfiles: 'deny',
            headers: {
                // Cache images for 7 days in the browser
                'Cache-Control': 'public, max-age=604800, immutable',
            }
        };

        res.sendFile(filename, options, err => {
            if (err) {
                logger.error(err, `Failed to serve image: ${filename}`);
                // Don't call next(err) — just send 404 so the avatar falls back gracefully
                if (!res.headersSent) res.status(404).json({ message: 'Image not found.' });
            } else {
                logger.debug(`Served image: ${filename}`);
            }
        });
    });

    app.use('/api/images/players', router);
};
