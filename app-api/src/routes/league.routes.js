import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import * as LeagueController from '../controllers/league.controller.js';
import { LEAGUE_MATCH_ID } from '../rules/leagues.js';

// the leagues of the selected club: its admins run them, its members play
export default (app) => {
    const router = Router();
    const id = param('id').isMongoId().withMessage('Invalid league.');
    const match = param('match').matches(LEAGUE_MATCH_ID).withMessage('Invalid match.');

    router.get('/', LeagueController.list);
    router.get('/:id', id, validate, LeagueController.findOne);
    router.post('/:id/matches/:match/start', id, match, body('first').optional({ values: 'null' }).isMongoId(), validate, LeagueController.startOne);

    // the club's admins
    router.post('/', requireClubAdmin, LeagueController.create);
    router.put('/:id', requireClubAdmin, id, validate, LeagueController.update);
    router.delete('/:id', requireClubAdmin, id, validate, LeagueController.remove);
    router.post('/:id/start', requireClubAdmin, id, validate, LeagueController.start);
    router.post('/:id/cancel', requireClubAdmin, id, validate, LeagueController.cancel);
    router.put('/:id/matches/:match/result', requireClubAdmin, id, match, body('winner').isMongoId().withMessage('Choose the winner.'), validate, LeagueController.result);
    router.put('/:id/matches/:match/date', requireClubAdmin, id, match, body('date').optional({ values: 'null' }).isISO8601().withMessage('Choose a day.'), validate, LeagueController.moveOne);
    router.put('/:id/matchdays/:day/date', requireClubAdmin, id, param('day').isInt({ min: 1, max: 99 }).withMessage('Invalid matchday.'), body('date').isISO8601().withMessage('Choose a day.'), validate, LeagueController.moveDay);

    app.use('/api/leagues', router);
};
