import logger from '../models/logger.model.js';
import { createPlayerFilterQuery } from '../utils/player.utils.js';
import db from '../models/db.model.js';

const Player = db.player;

export const create = (req, res) => {
    logger.debug('players create called');
    const player = new Player({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        nickname: req.body.nickname,
        profileImg: req.file ? req.file.filename : '',
    });
    player.save()
        .then(data => res.send(data.toJSON()))
        .catch(err => res.status(500).send({ message: err.message || 'Some error occurred while creating the Player.' }));
};

export const findAll = (req, res) => {
    logger.debug('players find all called!');
    const condition = req.query.title
        ? { title: { $regex: new RegExp(req.query.title), $options: 'i' } }
        : {};
    Player.find(condition)
        .then(data => res.send(data.map(p => p.toJSON())))
        .catch(err => res.status(500).send({ message: err.message || 'Some error occurred while retrieving players.' }));
};

export const findBySearchTerm = (req, res) => {
    logger.debug('players find by search term called!');
    const searchTerm = req.query.searchTerm;
    const condition = searchTerm
        ? {
            $or: [
                { firstname: { $regex: new RegExp(searchTerm, 'i') } },
                { lastname: { $regex: new RegExp(searchTerm, 'i') } },
                { nickname: { $regex: new RegExp(searchTerm, 'i') } },
            ],
        }
        : {};
    Player.find(condition)
        .then(data => res.send(data.map(p => p.toJSON())))
        .catch(err => res.status(500).send({ message: err.message || 'Some error occurred while retrieving players.' }));
};

export const findByIds = (req, res) => {
    logger.debug('players find by ids called!');
    const query = createPlayerFilterQuery(req.body);
    Player.find(query)
        .then(data => res.send(data.map(p => p.toJSON())))
        .catch(err => res.status(500).send({ message: err.message || 'Some error occurred while retrieving players.' }));
};

export const findOne = (req, res) => {
    logger.debug('players find one called!');
    Player.findById(req.params.id)
        .then(data => {
            if (!data) return res.status(404).send({ message: 'Player not found.' });
            res.send(data.toJSON());
        })
        .catch(_err => res.status(500).send({ message: 'Error retrieving Player with id=' + req.params.id }));
};

export const update = (req, res) => {
    logger.debug('players update called!');
    const updateData = {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        nickname: req.body.nickname,
    };
    if (req.file) updateData.profileImg = req.file.filename;

    Player.findByIdAndUpdate(req.params.id, { $set: updateData })
        .then(data => {
            if (!data) return res.status(404).send({ message: 'Player not found.' });
            res.send({ message: 'Player was updated successfully.' });
        })
        .catch(_err => res.status(500).send({ message: 'Error updating Player with id=' + req.params.id }));
};

export const remove = (req, res) => {
    logger.debug('players delete called!');
    Player.findByIdAndDelete(req.params.id)
        .then(data => {
            if (!data) return res.status(404).send({ message: 'Player not found.' });
            res.send({ message: 'Player was deleted successfully!' });
        })
        .catch(_err => res.status(500).send({ message: 'Could not delete Player with id=' + req.params.id }));
};
