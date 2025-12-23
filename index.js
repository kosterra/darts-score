require("dotenv").config();

const {
    UI_URL
} = process.env;

const express = require("express");
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require("cors");
const db = require("./src/models/db.model");
const logger = require("./src/models/logger.model");
const rateLimit = require('express-rate-limit');

logger.info('Using logger in level ' + logger.level)

const app = express();

// set up cors
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || origin === UI_URL) {
            logger.debug(origin + ': CORS allowed');
            callback(null, true);
        } else {
            logger.debug('CORS error: not allowed');
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions));

// set up rate limiter: maximum of five requests per minute
var limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100000, // 100'000 requests per windowMs
});

// apply rate limiter to all requests
app.use(limiter);

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(cookieParser());

app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(bodyParser.json({ limit: "30mb", extended: true }));

logger.debug(db.url);

db.mongoose
  .connect(db.url)
  .then(() => {
    logger.info("Connected to the database!");
  })
  .catch(err => {
    logger.error("Cannot connect to the database!");
    logger.error(err);
    process.exit();
  });

require("./src/routes/player.routes")(app);
require("./src/routes/stats.routes")(app);
require("./src/routes/x01.routes")(app);
require("./src/routes/cricket.routes")(app);
require("./src/routes/elimination.routes")(app);
require("./src/routes/player.img.routes")(app);
require("./src/routes/atc.routes")(app);

// All other GET requests not handled before will return the static html page
app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, './public/index.html'));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    logger.debug(req);
    logger.debug(res);
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, res) {
        res.status( err.code || 500 )
            .json({
                status: 'error',
                message: err
            });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, res) {
    res.status(err.status || 500)
        .json({
            status: 'error',
            message: err.message
        });
});

// listen to port
app.listen(3001, () => {
    logger.info(`Server listening on 3001`);
});
