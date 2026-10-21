import mongoose from 'mongoose';
import dbConfig from '../config/db.config.js';
import playerModel from './player.model.js';
import x01Model from './x01.model.js';
import cricketModel from './cricket.model.js';
import eliminationModel from './elimination.model.js';
import clockModel from './clock.model.js';
import atcModel from './atc.model.js';
import userModel from './user.model.js';
import clubModel from './club.model.js';
import settingModel from './setting.model.js';
import logEntryModel from './log.entry.model.js';
import alertModel from './alert.model.js';
import blockedIpModel from './blocked.ip.model.js';
import integrityReviewModel from './integrity.review.model.js';
import notificationModel from './notification.model.js';
import deletionRequestModel from './deletion.request.model.js';
import joinRequestModel from './join.request.model.js';
import quickGameModel from './quick.game.model.js';

const db = {
  mongoose,
  url: dbConfig.url,
  player: playerModel(mongoose),
  x01: x01Model(mongoose),
  x01Training: x01Model(mongoose, 'x01training'),
  cricket: cricketModel(mongoose),
  elimination: eliminationModel(mongoose),
  clock: clockModel(mongoose),
  atc: atcModel(mongoose),
  user: userModel(mongoose),
  club: clubModel(mongoose),
  setting: settingModel(mongoose),
  logEntry: logEntryModel(mongoose),
  alert: alertModel(mongoose),
  blockedIp: blockedIpModel(mongoose),
  integrityReview: integrityReviewModel(mongoose),
  notification: notificationModel(mongoose),
  deletionRequest: deletionRequestModel(mongoose),
  joinRequest: joinRequestModel(mongoose),
  quickGame: quickGameModel(mongoose),
};

export default db;
