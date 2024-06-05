module.exports = app => {
  const ATCController = require("../controllers/atc.controller.js");
  const { check, validationResult } = require("express-validator");

  const router = require("express").Router();

  // Create a new Cricket game
  router.post("/", [
    check('timeMs', 'Time must not be 0').notEmpty().isInt({ min: 1 })],
    (req, res, next) => {
      const error = validationResult(req).formatWith(({ msg }) => msg);

      const hasError = !error.isEmpty();

      if (hasError) {
        res.status(422).json({ error: error.array() });
      } else {
        next();
      }
    },
    ATCController.create
  );

  // Retrieve all Cricket games
  router.get("/", ATCController.findByQuery);

  // Delete a Cricket game with id
  router.delete("/:id", ATCController.delete);

  app.use("/api/training/atc", router);
};