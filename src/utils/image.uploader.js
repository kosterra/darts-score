const {
    IMG_DIR
} = process.env;

const logger = require("../models/logger.model");
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DIR = '/players';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const path = './' + IMG_DIR + DIR;
        fs.mkdirSync(path, { recursive: true })
        cb(null, path);
    },
    filename: (req, file, cb) => {
        const fileName = file.originalname.toLowerCase().split(' ').join('-');
        logger.debug('Save profile image ' + fileName);
        cb(null, uuidv4() + '-' + fileName)
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
}).single('profileImg');

exports.upload = (req, res, next) => {
    upload(req, res, function (err) {
        logger.debug('Upload profile image')
        
        if (err instanceof multer.MulterError) {
            logger.error('Error on profile image upload: ' + err);
            return res.status(500).send({
                message:
                    err.message || "Some error occurred while uploading the profile image."
            });
        } else if (err) {
            logger.error('Unkonwn error occured on profile image upload: ' + err);
            return res.status(500).send({
                message:
                    err.message || "Some error occurred while uploading the profile image."
            });
        }
        next();
    })
};