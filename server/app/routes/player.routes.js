module.exports = app => {
    const playerController = require("../controllers/player.controller.js");
    const { check, validationResult } = require("express-validator");

    const router = require("express").Router();
  
    // Create a new Player
    router.post("/", [
        check('firstname', 'Use between 3 and 25 characters for firstname').isLength({ min: 3, max: 25 }),
        check('firstname', 'Use characters only for firstname').matches(/^[A-Za-zéèàäöü\s]+$/),
        check('lastname', 'Use between 3 and 25 characters for lastname').isLength({ min: 3, max: 25 }),
        check('lastname', 'Use characters only for lastname').matches(/^[A-Za-zéèàäöü\s]+$/),
        check('nickname', 'Use between 3 and 25 characters for nickname').isLength({ min: 3, max: 25 }),
        check('nickname', 'Use characters only for nickname').matches(/^[A-Za-zéèàäöü\s]+$/)],
      (req, res, next) => {
        const error = validationResult(req).formatWith(({ msg }) => msg);
    
        const hasError = !error.isEmpty();
    
        if (hasError) {
          res.status(422).json({ error: error.array() });
        } else {
          next();
        }
      },
      playerController.create
    );
  
    // Retrieve all Players
    router.get("/", playerController.findAll);
  
    // Search Players
    router.get("/search", playerController.findBySearchTerm);

    // Retrieve a single Player with id
    router.get("/:id", playerController.findOne);
  
    // Update a Player with id
    router.put("/:id", playerController.update);
  
    // Delete a Player with id
    router.delete("/:id", playerController.delete);
  
    app.use("/api/players", router);
  };