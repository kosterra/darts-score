const dbConfig = require("../config/db.config.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;
db.player = require("./player.model.js")(mongoose);
db.x01 = require("./x01.model.js")(mongoose);

module.exports = db;