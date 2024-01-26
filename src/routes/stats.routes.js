module.exports = app => {
    const PlayerStatsController = require("../controllers/player.stats.controller")
    const X01StatsController = require("../controllers/x01.stats.controller")
    const PlayersX01StatsController = require("../controllers/players.x01.stats.controller")
    const router = require("express").Router();
  
    // Retrieve stats for a player
    router.get("/player/:id", PlayerStatsController.getPlayerStats)
    // Retrieve stats for a x01 game
    router.get("/games/x01/:id", X01StatsController.getX01Stats)
    // Retrieve X01 stats for multiple players
    router.post("/players/x01", PlayersX01StatsController.getPlayersX01Stats)
  
    app.use("/api/stats", router)
};