import db from '../models/db.model.js';
import { createGameController } from './game.controller.js';

export default createGameController(db.clock, 'Around the Clock', 'clock');
