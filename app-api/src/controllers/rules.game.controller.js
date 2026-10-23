import db from '../models/db.model.js';
import { createGameController } from './game.controller.js';

// the games of the rules engine share the handlers of the other games
export default createGameController(db.rulesGame, 'Darts');
