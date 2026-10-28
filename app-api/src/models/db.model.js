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
import rulesGameModel from './rules.game.model.js';
import rulesTrainingModel from './rules.training.model.js';
import clubTallyModel from './club.tally.model.js';
import fairPlayHitModel from './fair.play.hit.model.js';
import playerContactModel from './player.contact.model.js';
import playerClaimModel from './player.claim.model.js';
import noticeSentModel from './notice.sent.model.js';
import sessionModel from './session.model.js';
import usageDayModel from './usage.day.model.js';
import tournamentModel from './tournament.model.js';
import leagueModel from './league.model.js';
import attendanceModel from './attendance.model.js';
import quickEveningModel from './quick.evening.model.js';
import screenPairingModel from './screen.pairing.model.js';

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
  rulesGame: rulesGameModel(mongoose),
  rulesTraining: rulesTrainingModel(mongoose),
  clubTally: clubTallyModel(mongoose),
  fairPlayHit: fairPlayHitModel(mongoose),
  playerContact: playerContactModel(mongoose),
  playerClaim: playerClaimModel(mongoose),
  noticeSent: noticeSentModel(mongoose),
  session: sessionModel(mongoose),
  usageDay: usageDayModel(mongoose),
  tournament: tournamentModel(mongoose),
  league: leagueModel(mongoose),
  attendance: attendanceModel(mongoose),
  quickEvening: quickEveningModel(mongoose),
  screenPairing: screenPairingModel(mongoose),
};

export default db;
