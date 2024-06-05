module.exports = app => {
    const {
        IMG_DIR
    } = process.env || '/app/data/img';

    const router = require("express").Router();
    const logger = require("../models/logger.model");

    // Get player profile img
    router.get("/:id", function (req, res, next) {
        var options = {
            root: IMG_DIR,
            dotfiles: 'deny',
            headers: {
                'x-timestamp': Date.now(),
                'x-sent': true
            }
        }

        var filename = req.params.id;
        res.sendFile('/players/' + filename, options, function (err) {
            if (err) {
                logger.error(err);
                next(err)
            } else {
                logger.debug('Sent:', filename)
            }
        })
    });

    app.use('/api/images/players/', router);
};