module.exports = app => {
    const StatsController = require("../controllers/stats.controller");
    const router = require("express").Router();
  
    // Retrieve stats for a player
    router.get("/player/:id", StatsController.getPlayerStats);
  
    app.use("/api/stats", router);
};