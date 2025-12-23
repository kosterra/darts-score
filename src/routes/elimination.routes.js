module.exports = app => {
  const EliminationController = require("../controllers/elimination.controller.js");
  const { check, validationResult } = require("express-validator");

  const router = require("express").Router();

  // Create a new Elimination game
  router.post("/", [
    check('numberOfPlayers', 'Number of Players must be between 1 and 4').isIn([1, 2, 3, 4])],
    (req, res, next) => {
      const error = validationResult(req).formatWith(({ msg }) => msg);

      const hasError = !error.isEmpty();

      if (hasError) {
        res.status(422).json({ error: error.array() });
      } else {
        next();
      }
    },
    EliminationController.create
  );

  // Retrieve Elimination games by filters
  router.post("/find", EliminationController.findByFilters);

  // Retrieve all Elimination games
  router.get("/", EliminationController.findAll);

  // Retrieve a single Elimination game with id
  router.get("/:id", EliminationController.findOne);

  // Update a Elimination game with id
  router.put("/:id", EliminationController.update);

  // Delete a Elimination game with id
  router.delete("/:id", EliminationController.delete);

  app.use("/api/games/elimination", router);
};