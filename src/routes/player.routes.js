module.exports = app => {
  const PlayerController = require("../controllers/player.controller");
  const FileController = require("../controllers/file.controller");
  const router = require("express").Router();
  const { body } = require("express-validator");
  const { validate } = require("../utils/validation");

  // Error handling middleware
  const errorHandler = (err, req, res, next) => {
    logger.error(err);
    res.status(500).send({
      message: "An unexpected error occurred."
    });
  };

  // Apply error handling middleware
  router.use(errorHandler);

  let validator = [
    body('firstname').not().isEmpty().withMessage('Firstname is required')
      .isLength({ min: 3, max: 25 }).withMessage('Use between 3 and 25 characters for firstname')
      .matches(/^[A-Za-zéèàäöü\s]+$/).withMessage('Use characters only for firstname'),
    body('lastname').not().isEmpty().withMessage('Lastname is required')
      .isLength({ min: 3, max: 25 }).withMessage('Use between 3 and 25 characters for lastname')
      .matches(/^[A-Za-zéèàäöü\s]+$/).withMessage('Use characters only for lastname'),
    body('nickname').not().isEmpty().withMessage('Nickname is required')
      .isLength({ min: 3, max: 25 }).withMessage('Use between 3 and 25 characters for nickname')
      .matches(/^[A-Za-zéèàäöü\s]+$/).withMessage('Use characters only for nickname'),
    validate
  ];

  // Create a new Player
  router.post('/',
    FileController.uploadProfileImage,
    validator,
    PlayerController.create);

  // Retrieve all Players
  router.get("/", PlayerController.findAll);

  // Search Players
  router.get("/search", PlayerController.findBySearchTerm);

  // Find Players by Ids
  router.post("/find", PlayerController.findByIds);

  // Retrieve a single Player with id
  router.get("/:id", PlayerController.findOne);

  // Update a Player with id
  router.put("/:id",
    FileController.deleteProfileImage,
    FileController.uploadProfileImage,
    validator,
    PlayerController.update);

  // Delete a Player with id
  router.delete("/:id",
    FileController.deleteProfileImage,
    PlayerController.delete
  );

  app.use("/api/players", router);
};