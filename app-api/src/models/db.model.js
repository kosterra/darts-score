import mongoose from 'mongoose';
import dbConfig from '../config/db.config.js';
import playerModel from './player.model.js';
import x01Model from './x01.model.js';
import cricketModel from './cricket.model.js';
import eliminationModel from './elimination.model.js';
import atcModel from './atc.model.js';

const db = {
  mongoose,
  url: dbConfig.url,
  player: playerModel(mongoose),
  x01: x01Model(mongoose),
  cricket: cricketModel(mongoose),
  elimination: eliminationModel(mongoose),
  atc: atcModel(mongoose),
};

export default db;
