module.exports = app => {
    const X01Controller = require("../controllers/x01.controller.js");
    const { check, validationResult } = require("express-validator");

    const router = require("express").Router();
  
    // Create a new X01 game
    router.post("/", [
        check('setMode', 'Must be one of the values "Best of" / "First to"').isIn(['Best of', 'First to']),
        check('legMode', 'Must be one of the values "Best of" / "First to"').isIn(['Best of', 'First to']),
        check('legInMode', 'Must be one of the values "Straight In" / "Double In / Master In"').isIn(['Straight In', 'Double In', 'Master In']),
        check('legOutMode', 'Must be one of the values "Straight Out" / "Double Out / Master Out"').isIn(['Straight Out', 'Double Out', 'Master Out']),
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
      X01Controller.create
    );
  
    // Retrieve all X01 games
    router.get("/", X01Controller.findAll);

    // Retrieve a single X01 game with id
    router.get("/:id", X01Controller.findOne);
  
    // Update a X01 game with id
    router.put("/:id", X01Controller.update);
  
    // Delete a X01 game with id
    router.delete("/:id", X01Controller.delete);
  
    app.use("/api/games/x01", router);
  };