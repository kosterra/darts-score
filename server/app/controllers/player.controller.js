const logger = require("../models/logger.model");
const db = require("../models/db.model");
const Player = db.player;

// Create and Save a new Player
exports.create = (req, res) => {
  // Create a Player
  const player = new Player({
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    nickname: req.body.nickname
  });

  // Save Player in the database
  player.save(player)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the Player."
      });
    });
};

// Retrieve all Players from the database.
exports.findAll = (req, res) => {
  logger.debug("players find all called!");
  const title = req.query.title;
  var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};

  Player.find(condition)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving players."
      });
    });
};

// Find a single Player with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Player.findById(id)
    .then(data => {
      if (!data)
        res.status(404).send({ message: "Not found Player with id " + id });
      else res.send(data);
    })
    .catch(err => {
      res
        .status(500)
        .send({ message: "Error retrieving Player with id=" + id });
    });
};

// Update a Player by the id in the request
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can not be empty!"
    });
  }

  const id = req.params.id;

  Player.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update Player with id=${id}. Maybe Player was not found!`
        });
      } else res.send({ message: "Player was updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating Player with id=" + id
      });
    });
};

// Delete a Player with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  Player.findByIdAndRemove(id, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete Player with id=${id}. Maybe Player was not found!`
        });
      } else {
        res.send({
          message: "Player was deleted successfully!"
        });
      }
    }).catch(err => {
      logger.error(err);
      res.status(500).send({
        message: "Could not delete Player with id=" + id
      });
    });
};

// Find by search term
exports.findBySearchTerm = (req, res) => {
  const searchTerm = req.query.search ? req.query.search : '';

  logger.debug('Searching players by searchTerm: ' + searchTerm);

  Player.find({
    $or: [
      {firstname: {$regex: searchTerm}},
      {lastname: {$regex: searchTerm}},
      {nickname: {$regex: searchTerm}}
    ],
  }).then(data => {
    res.send(data);
  }).catch(err => {
    res.status(500).send({
      message:
        err.message || "Some error occurred while retrieving players."
    });
  });
}