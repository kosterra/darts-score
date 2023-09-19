module.exports = app => {
    const CricketController = require("../controllers/cricket.controller.js");
    const { check, validationResult } = require("express-validator");

    const router = require("express").Router();
  
    // Create a new Cricket game
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
      CricketController.create
    );
  
    // Retrieve all Cricket games
    router.get("/", CricketController.findAll);

    // Retrieve a single Cricket game with id
    router.get("/:id", CricketController.findOne);
  
    // Update a Cricket game with id
    router.put("/:id", CricketController.update);
  
    // Delete a Cricket game with id
    router.delete("/:id", CricketController.delete);
  
    app.use("/api/games/cricket", router);
  };