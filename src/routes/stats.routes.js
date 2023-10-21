module.exports = app => {
    const PlayerStatsController = require("../controllers/player.stats.controller");
    const X01StatsController = require("../controllers/x01.stats.controller");
    const router = require("express").Router();
  
    // Retrieve stats for a player
    router.get("/player/:id", PlayerStatsController.getPlayerStats);
    // Retrieve stats for a x01 game
    router.get("/games/x01/:id", X01StatsController.getX01Stats);
  
    app.use("/api/stats", router);
};