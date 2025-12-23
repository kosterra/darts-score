const logger = require("../models/logger.model.js");
const db = require("../models/db.model.js");
const Elimination = db.elimination;
const { createGameFilterQuery } = require('../utils/game.utils.js');

// Create and Save a new Elimination game
exports.create = (req, res) => {
    logger.debug("create Elimination game called!");

    try {
        // Create a Elimination Game
        const elimination = new Elimination(req.body);

        // Save Elimination game in the database
        elimination.save(elimination)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                logger.error(err);
                res.status(500).send({
                    message:
                        err.message || "Some error occurred while creating the Elimination game."
                });
            });
    } catch (error) {
        logger.error(error);
    }
};

// Retrieve all Elimination games from the database.
exports.findByFilters = (req, res) => {
    logger.debug("Elimination games find by filters called!");
    let query = createGameFilterQuery(req.body);

    Elimination.find(query)
        .then(data => {
            res.send(data);
        })
        .catch(err => {
            logger.error('Failed to find Elimination games. ' + err);
            res.status(500).send({
                message:
                    err.message || "Some error occurred while filter Elimination games."
            });
        });
};

// Retrieve all Elimination games from the database.
exports.findAll = (req, res) => {
    logger.debug("Elimination games find all called!");
    const title = req.query.title;
    var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

    Elimination.find(condition)
        .then(data => {
            res.send(data);
        })
        .catch(err => {
            logger.error('Failed to load all Elimination games. ' + err);
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving Elimination games."
            });
        });
};

// Find a single Elimination game with an id
exports.findOne = (req, res) => {
    logger.debug("Elimination games find one called!");
    const id = req.params.id;

    Elimination.findById(id)
        .then(data => {
            if (!data)
                res.status(404).send({ message: "Not found Elimination game with id " + id });
            else res.send(data);
        })
        .catch(err => {
            logger.error('Error retrieving Elimination game with id ' + id + ', ' + err);
            res.status(500)
                .send({ message: "Error retrieving Elimination game with id " + id });
        });
};

// Update a Elimination game by the id in the request
exports.update = (req, res) => {
    logger.debug("Elimination games update called!");
    if (!req.body) {
        return res.status(400).send({
            message: "Data to update can not be empty!"
        });
    }

    const id = req.params.id;

    Elimination.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
        .then(data => {
            if (!data) {
                res.status(404).send({
                    message: `Cannot update Elimination game with id=${id}. Maybe Elimination game was not found!`
                });
            } else res.send({ message: "Elimination game was updated successfully." });
        })
        .catch(err => {
            logger.debug(err);
            res.status(500).send({
                message: "Error updating Elimination game with id=" + id
            });
        });
};

// Delete a Elimination game with the specified id in the request
exports.delete = (req, res) => {
    logger.debug("Elimination games delete called!");
    const id = req.params.id;

    Elimination.findByIdAndDelete(id, { useFindAndModify: false })
        .then(data => {
            if (!data) {
                res.status(404).send({
                    message: `Cannot delete Elimination game with id=${id}. Maybe Elimination game was not found!`
                });
            } else {
                res.send({
                    message: "Elimination game was deleted successfully!"
                });
            }
        }).catch(err => {
            logger.error(err);
            res.status(500).send({
                message: "Could not delete Elimination game with id=" + id
            });
        });
};