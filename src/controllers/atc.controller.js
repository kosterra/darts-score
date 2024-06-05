const logger = require("../models/logger.model");
const db = require("../models/db.model");
const ATC = db.atc;

// Create and Save a new ATC entry
exports.create = (req, res) => {
    logger.debug("atc entry create called!");

    try {
        // Create an ATC entry
        const atc = new ATC(req.body);

        // Save ATC entry to the database
        atc.save(atc)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                logger.error(err);
                res.status(500).send({
                    message:
                        err.message || "Some error occurred while creating the ATC entry."
                });
            });
    } catch (error) {
        logger.error(error);
    }
};

// Retrieve all ATC entries from the database.
exports.findByQuery = (req, res) => {
    logger.debug("atc entries find by query called!");
    const mode = req.query.mode ? req.query.mode : '';

    logger.debug('Searching atc entries by query: ' + mode);

    ATC.find({
        $or: [
            { mode: { $regex: mode } }
        ],
    }).then(data => {
        res.send(data);
    })
    .catch(err => {
        res.status(500).send({
            message:
                err.message || "Some error occurred while retrieving ATC entries."
        });
    });
};

// Delete an ATC entry with the specified id in the request
exports.delete = (req, res) => {
    logger.debug("ATC entry delete called!");

    const id = req.params.id;

    ATC.findByIdAndDelete(id, { useFindAndModify: false })
        .then(data => {
            if (!data) {
                res.status(404).send({
                    message: `Cannot delete ATC entry with id=${id}. Maybe ATC entry was not found!`
                });
            } else {
                res.send({
                    message: "ATC entry was deleted successfully!"
                });
            }
        }).catch(err => {
            logger.error(err);
            res.status(500).send({
                message: "Could not delete ATC entry with id=" + id
            });
        });
};