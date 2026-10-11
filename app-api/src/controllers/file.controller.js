import logger from '../models/logger.model.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PLAYER_SUBDIR = '/players';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join('./', process.env.IMG_DIR, PLAYER_SUBDIR);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const sanitised = file.originalname.toLowerCase().replace(/\s+/g, '-');
        cb(null, uuidv4() + '-' + sanitised);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['image/png', 'image/jpg', 'image/jpeg'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg formats are allowed!'));
        }
    },
}).single('profileImg');

export const uploadProfileImage = (req, res, next) => {
    logger.debug('uploadProfileImage middleware called');
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            logger.error('Multer error on profile image upload: ' + err);
        } else if (err) {
            logger.error('Unknown error on profile image upload: ' + err);
        }
        next();
    });
};

const extractFilename = (profileImg) => {
    if (!profileImg) return null;
    if (profileImg.startsWith('http://') || profileImg.startsWith('https://')) {
        const segments = profileImg.split('/');
        return segments[segments.length - 1] || null;
    }
    return profileImg;
};

export const removeProfileImageFile = (profileImg) => {
    const filename = extractFilename(profileImg);
    if (!filename) return;
    const filePath = path.join('./', process.env.IMG_DIR, PLAYER_SUBDIR, path.basename(filename));
    logger.debug('Deleting profile image at: ' + filePath);
    fs.unlink(filePath, (err) => {
        if (err) logger.error('Failed to delete profile image file: ' + err.message);
    });
};
