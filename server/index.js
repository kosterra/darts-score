require("dotenv").config();

const express = require("express");
const fs = require('fs');
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const db = require("./app/models/db.model");
const logger = require("./app/models/logger.model");

const apiPort = process.env.API_PORT || 3001;
const uiPort = process.env.UI_PORT || 3000;
const dataPath = '../data/data.json';

const readData = () => JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const writeData = data => fs.writeFileSync(dataPath, JSON.stringify(data));

const app = express();

var corsOptions = {
    origin: "http://localhost:" + uiPort
};

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(cookieParser());
app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

logger.debug(db.url);

db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    logger.info("Connected to the database!");
  })
  .catch(err => {
    logger.error("Cannot connect to the database!");
    logger.error(err);
    process.exit();
  });

require("./app/routes/tutorial.routes")(app);
require("./app/routes/player.routes")(app);

// API Endpoints
app.get("/api/v1/data", (req, res) => {
    if(!fs.existsSync(dataPath)) {
      writeData({});
    }
    res.status(200).json(readData());
});
  
app.post("/api/v1/data", function(req, res) {
    writeData(req.body);
    res.status(200).json({});
});

// All other GET requests not handled before will return the static html page
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, './public/index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status( err.code || 500 )
            .json({
                status: 'error',
                message: err
            });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500)
        .json({
            status: 'error',
            message: err.message
        });
});

// listen to port
app.listen(apiPort, () => {
    logger.info(`Server listening on ${ apiPort }`);
});

