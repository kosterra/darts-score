import logger from '../models/logger.model.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PLAYER_SUBDIR = '/players';
const CLUB_SUBDIR = '/clubs';
const ALLOWED_TYPES = ['image/png', 'image/jpg', 'image/jpeg'];

/**
 * Middleware that stores one uploaded image of the given form field in a
 * sub-folder of IMG_DIR. Upload problems are logged; the request goes on
 * without a file.
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
            else cb(new Error('Only .png, .jpg and .jpeg formats are allowed!'));
        },
    }).single(field);

    return (req, res, next) => {
        upload(req, res, (err) => {
            if (err) logger.error(`Upload of ${field} failed: ${err}`);
            next();
        });
    };
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
