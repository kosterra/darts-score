const logger = require("../models/logger.model");
const db = require("../models/db.model");
const Cricket = db.cricket;

// Create and Save a new Cricket game
exports.create = (req, res) => {
  logger.debug("create cricket game called!");

  try {
    // Create a Cricket Game
    const cricket = new Cricket(req.body);

    // Save Cricket game in the database
    cricket.save(cricket)
      .then(data => {
        res.send(data);
      })
      .catch(err => {
        logger.error(err);
        res.status(500).send({
          message:
            err.message || "Some error occurred while creating the Cricket game."
        });
      });
  } catch(error) {
    logger.error(error);
  }
};

// Retrieve all Cricket games from the database.
exports.findAll = (req, res) => {
  logger.debug("cricket games find all called!");
  const title = req.query.title;
  var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  Cricket.find(condition)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving Cricket games."
      });
    });
};

// Find a single Cricket game with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Cricket.findById(id)
    .then(data => {
      if (!data)
        res.status(404).send({ message: "Not found Cricket game with id " + id });
      else res.send(data);
    })
    .catch(err => {
      res
        .status(500)
        .send({ message: "Error retrieving Cricket game with id=" + id });
    });
};

// Update a Cricket game by the id in the request
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can not be empty!"
    });
  }

  const id = req.params.id;

  Cricket.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update Cricket game with id=${id}. Maybe Cricket game was not found!`
        });
      } else res.send({ message: "Cricket game was updated successfully." });
    })
    .catch(err => {
      logger.debug(err);
      res.status(500).send({
        message: "Error updating cricket game with id=" + id
      });
    });
};

// Delete a Cricket game with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Cricket.findByIdAndRemove(id, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete Cricket game with id=${id}. Maybe Cricket game was not found!`
        });
      } else {
        res.send({
          message: "Cricket game was deleted successfully!"
        });
      }
    }).catch(err => {
      logger.error(err);
      res.status(500).send({
        message: "Could not delete Cricket game with id=" + id
      });
    });
};