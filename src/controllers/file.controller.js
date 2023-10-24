const {
    IMG_DIR
} = process.env || '/app/data/img';

const logger = require("../models/logger.model");
const db = require("../models/db.model");
const Player = db.player;
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DIR = '/players';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        logger.debug(req);
        logger.debug(file);
        const path = './' + IMG_DIR + DIR;
        fs.mkdirSync(path, { recursive: true })
        cb(null, path);
    },
    filename: (req, file, cb) => {
        logger.debug(req);
        const fileName = file.originalname.toLowerCase().split(' ').join('-');
        logger.debug('Save profile image ' + fileName);
        cb(null, uuidv4() + '-' + fileName)
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        logger.debug(req);
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
}).single('profileImg');

exports.uploadProfileImage = (req, res, next) => {
    logger.debug("profile image update called!");
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

exports.deleteProfileImage = (req, res, next) => {
    logger.debug("profile image delete called!");
    const id = req.params.id;

    Player.findById(id).then(data => {
      if (data && data.profileImg) {
        const segments = data.profileImg.split('/');
        const last = segments.pop() || segments.pop();
        const path = './' + IMG_DIR + DIR + '/' + last;
        logger.debug(path);
        
        fs.unlink(path, (err) => {
            if (err) {
                logger.error(err)
            } else {
                logger.info('Succsessfully deleted profile image for player ' + data.nickname);
            }
        });
        next();
      }
    }).catch(err => {
        logger.error(err);
        res.status(500).send({ message: "Error retrieving Player with id=" + id });
    });
};