const express = require("express");
const fs = require('fs');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");

const dataPath = '../data/data.json';
const PORT = process.env.PORT || 3001;

const readData = () => JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const writeData = data => fs.writeFileSync(dataPath, JSON.stringify(data));

const app = express();

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
const log_format = process.env.NODE_ENV == 'development' ? 'dev' : 'tiny'
app.use(logger(log_format));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

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
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

