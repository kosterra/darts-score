module.exports = app => {
    const PlayerController = require("../controllers/player.controller");
    const ImageUploader = require("../utils/image.uploader");
    const router = require("express").Router();
    const { body } = require("express-validator");
    const { commonValidation } = require("../validators/common.validation")

    // Create a new Player
    router.post('/',
        ImageUploader.upload,
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