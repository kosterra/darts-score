require("dotenv").config();

const express = require("express");
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require("cors");
const db = require("./app/models/db.model");
const logger = require("./app/models/logger.model");

const apiPort = process.env.API_PORT || 3001;
const uiPort = process.env.UI_PORT || 3000;

const app = express();

var corsOptions = {
    origin: "http://localhost:" + uiPort
};

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(cookieParser());
app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(bodyParser.json({ limit: "30mb", extended: true }));

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

require("./app/routes/player.routes")(app);
require("./app/routes/x01.routes")(app);
require("./app/routes/player.img.routes")(app);

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
