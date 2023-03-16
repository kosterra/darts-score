module.exports = app => {
    const {
      IMG_DIR
    } = process.env;

    const PlayerController = require("../controllers/player.controller.js");
    const router = require("express").Router();
    const multer = require('multer');
    const fs = require('fs');
    const { body } = require("express-validator");
    const { v4: uuidv4 } = require('uuid');
    const { commonValidation } = require("../validators/common.validation")

    const DIR = '/players';

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const path = '.' + IMG_DIR + DIR;
            fs.mkdirSync(path, { recursive: true })
            cb(null, path);
        },
        filename: (req, file, cb) => {
            const fileName = file.originalname.toLowerCase().split(' ').join('-');
            cb(null, uuidv4() + '-' + fileName)
        }
    });
    
    var upload = multer({
        storage: storage,
        fileFilter: (req, file, cb) => {
            if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
                cb(null, true);
            } else {
                cb(null, false);
                return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
            }
        }
    });

    // Create a new Player
    router.post('/',
        upload.single('profileImg'),
        [
          body('firstname', 'Use between 3 and 25 characters for firstname').isLength({ min: 3, max: 25 }),
          body('firstname', 'Use characters only for firstname').matches(/^[A-Za-zéèàäöü\s]+$/),
          body('lastname', 'Use between 3 and 25 characters for lastname').isLength({ min: 3, max: 25 }),
          body('lastname', 'Use characters only for lastname').matches(/^[A-Za-zéèàäöü\s]+$/),
          body('nickname', 'Use between 3 and 25 characters for nickname').isLength({ min: 3, max: 25 }),
          body('nickname', 'Use characters only for nickname').matches(/^[A-Za-zéèàäöü\s]+$/),
          commonValidation
        ],
        PlayerController.create);
  
    // Retrieve all Players
    router.get("/", PlayerController.findAll);
  
    // Search Players
    router.get("/search", PlayerController.findBySearchTerm);

    // Retrieve a single Player with id
    router.get("/:id", PlayerController.findOne);
  
    // Update a Player with id
    router.put("/:id", PlayerController.update);
  
    // Delete a Player with id
    router.delete("/:id", PlayerController.delete);
  
    app.use("/api/players", router);
  };