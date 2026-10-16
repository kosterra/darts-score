import logger from '../models/logger.model.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PLAYER_SUBDIR = '/players';
const CLUB_SUBDIR = '/clubs';
const ALLOWED_TYPES = ['image/png', 'image/jpg', 'image/jpeg'];

const WRONG_TYPE = 'Only .png, .jpg and .jpeg formats are allowed!';

/**
 * Middleware that stores one uploaded image of the given form field in a
 * sub-folder of IMG_DIR. A wrong file type and problems on the server (e.g. a
 * folder the app may not write to) are answered right away, each with its
 * own message, instead of going on as if no image had been sent.
 */
const createImageUpload = (subdir, field) => {
    const upload = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                const dir = path.join('./', process.env.IMG_DIR, subdir);
                fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                const sanitised = file.originalname.toLowerCase().replace(/\s+/g, '-');
                cb(null, uuidv4() + '-' + sanitised);
            },
        }),
        fileFilter: (req, file, cb) => {
            if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
            else cb(new Error(WRONG_TYPE));
        },
    }).single(field);

    return (req, res, next) => {
        upload(req, res, (err) => {
            if (!err) return next();
            logger.error(`Upload of ${field} failed: ${err}`);
            if (err.message === WRONG_TYPE) {
                return res.status(422).json({ errors: ['Please choose a .png or .jpg image.'] });
            }
            const notWritable = err.code === 'EACCES' || err.code === 'EPERM' || err.code === 'EROFS';
            res.status(500).json({
                message: notWritable
                    ? 'The picture could not be saved: the server may not write to its data folder. Please tell your administrator.'
                    : 'The picture could not be saved. Please try again.',
            });
        });
    };
};

/**
 * Whether the app may store pictures, checked at startup: logs how to fix it
 * when the data folder belongs to another user (e.g. created by Docker as root).
 */
export const checkImageFolder = () => {
    const dir = path.join('./', process.env.IMG_DIR || 'data/img');
    try {
        for (const subdir of [PLAYER_SUBDIR, CLUB_SUBDIR]) {
            fs.mkdirSync(path.join(dir, subdir), { recursive: true });
        }
        fs.accessSync(dir, fs.constants.W_OK);
    } catch (err) {
        logger.error(`Pictures cannot be saved, ${path.resolve(dir)} is not writable (${err.code ?? err.message}). `
            + 'With docker-compose.yml use the named volume for /app/data; with a folder of your own, give it to user 1000 (e.g. "chown -R 1000:1000 ./data").');
    }
};

export const uploadProfileImage = createImageUpload(PLAYER_SUBDIR, 'profileImg');
export const uploadClubLogo = createImageUpload(CLUB_SUBDIR, 'logo');

const extractFilename = (profileImg) => {
    if (!profileImg) return null;
    if (profileImg.startsWith('http://') || profileImg.startsWith('https://')) {
        const segments = profileImg.split('/');
        return segments[segments.length - 1] || null;
    }
    return profileImg;
};

const removeImageFile = (subdir, stored) => {
    const filename = extractFilename(stored);
    if (!filename) return;
    const filePath = path.join('./', process.env.IMG_DIR, subdir, path.basename(filename));
    logger.debug('Deleting image at: ' + filePath);
    fs.unlink(filePath, (err) => {
        if (err) logger.error('Failed to delete image file: ' + err.message);
    });
};

export const removeProfileImageFile = (profileImg) => removeImageFile(PLAYER_SUBDIR, profileImg);
export const removeClubLogoFile = (logo) => removeImageFile(CLUB_SUBDIR, logo);
