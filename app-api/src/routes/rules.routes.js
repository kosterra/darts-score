import { Router } from 'express';
import { screenGameRoutes } from './screen.routes.js';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import { validatePlayerIds, validateRulesGame, validateRulesTraining } from '../validators/game.validators.js';
import controller from '../controllers/rules.game.controller.js';
import * as TrainingController from '../controllers/rules.training.controller.js';

// the games and trainings of the rules engine (Shanghai, Killer, … and Bob's 27, 121 Checkout, …)
export default (app) => {
    const games = Router();
    games.post('/',    validateRulesGame, validate, controller.create);
    games.post('/find', validatePlayerIds, validate, controller.findByFilters);
    games.get('/',                                  controller.findAll);
    games.get('/:id',                               controller.findOne);
    games.put('/:id',  validateRulesGame, validate, controller.update);
    games.delete('/:id', requireClubAdmin,          controller.delete);
    // the big screen: a link, or sent to a TV by its code
    screenGameRoutes(games, 'rules');
    app.use('/api/games/rules', games);

    const trainings = Router();
    trainings.post('/', validateRulesTraining, validate, TrainingController.create);
    trainings.get('/', TrainingController.findByQuery);
    // the player's own trainings, or any as an admin of the club (checked in the controller)
    trainings.delete('/:id', TrainingController.del);
    app.use('/api/training/rules', trainings);
};
