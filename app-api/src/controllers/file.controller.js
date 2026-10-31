import logger from '../models/logger.model.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PLAYER_SUBDIR = '/players';
const CLUB_SUBDIR = '/clubs';
// the types we store, each with the first bytes a real file of that type starts with
const ALLOWED_MIMES = ['image/png', 'image/jpg', 'image/jpeg'];
const IMAGE_TYPES = [
    { ext: '.png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { ext: '.jpg', magic: [0xff, 0xd8, 0xff] },
];
// a picture is at most this big; larger uploads are refused rather than filling the disk
const MAX_BYTES = 5 * 1024 * 1024;
const WRONG_TYPE = ['Please choose a .png or .jpg image.'];

// the type of a file from its own first bytes (not the type the browser claims), or null
const detectType = (buffer) => IMAGE_TYPES.find(type => type.magic.every((byte, index) => buffer[index] === byte)) ?? null;

/**
 * Middleware that stores one uploaded image of the given form field in a
 * sub-folder of IMG_DIR. The type is decided by the file's own first bytes,
 * not the content-type the browser sends, and the file is saved under a fresh
 * random name with the extension of that real type — so a script dressed up
 * as an image (e.g. an SVG sent as image/png) is refused, and nothing is ever
 * served back as anything but a .png or .jpg. A wrong type, a too-large file
 * and problems on the server are each answered right away with their own
 * message, instead of going on as if no image had been sent.
 */
const createImageUpload = (subdir, field) => {
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: MAX_BYTES, files: 1 },
        // a first gate on the declared type; the real check is the bytes below
        fileFilter: (req, file, cb) => cb(null, ALLOWED_MIMES.includes(file.mimetype)),
    }).single(field);

    return (req, res, next) => {
        upload(req, res, (err) => {
            if (err) {
                logger.error(`Upload of ${field} failed: ${err}`);
                if (err.code === 'LIMIT_FILE_SIZE') return res.status(422).json({ errors: ['The picture is too large (at most 5 MB).'] });
                return res.status(400).json({ message: 'The picture could not be read. Please try again.' });
            }
            // no image sent (the field is optional): let the controller decide
            if (!req.file) return next();

            const type = detectType(req.file.buffer);
            if (!type) return res.status(422).json({ errors: WRONG_TYPE });

            try {
                const dir = path.join('./', process.env.IMG_DIR, subdir);
                fs.mkdirSync(dir, { recursive: true });
                // a fresh name and the extension of the detected type — never the uploaded name
                const filename = uuidv4() + type.ext;
                fs.writeFileSync(path.join(dir, filename), req.file.buffer);
                req.file.filename = filename;
                next();
            } catch (saveErr) {
                logger.error(`Saving ${field} failed: ${saveErr}`);
                const notWritable = saveErr.code === 'EACCES' || saveErr.code === 'EPERM' || saveErr.code === 'EROFS';
                res.status(500).json({
                    message: notWritable
                        ? 'The picture could not be saved: the server may not write to its data folder. Please tell your administrator.'
                        : 'The picture could not be saved. Please try again.',
                });
            }
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
