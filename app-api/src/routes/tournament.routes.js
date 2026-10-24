import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import * as TournamentController from '../controllers/tournament.controller.js';

// the tournaments of the selected club: its admins run them, its members enter and play
export default (app) => {
    const router = Router();
    const id = param('id').isMongoId().withMessage('Invalid tournament.');
    const match = param('match').matches(/^\d+-\d+$/).withMessage('Invalid match.');
    const answer = body('status').isIn(['in', 'out']).withMessage('Answer in or out.');

    router.get('/', TournamentController.list);
    router.get('/:id', id, validate, TournamentController.findOne);
    router.put('/:id/entry', id, answer, validate, TournamentController.answerMine);
    router.post('/:id/matches/:match/start', id, match, body('first').optional({ values: 'null' }).isMongoId(), validate, TournamentController.start);

    // the club's admins
    router.post('/', requireClubAdmin, TournamentController.create);
    router.put('/:id', requireClubAdmin, id, validate, TournamentController.update);
    router.delete('/:id', requireClubAdmin, id, validate, TournamentController.remove);
    router.post('/:id/open', requireClubAdmin, id, validate, TournamentController.open);
    router.post('/:id/close', requireClubAdmin, id, validate, TournamentController.close);
    router.post('/:id/reopen', requireClubAdmin, id, body('closesAt').isISO8601().withMessage('Choose until when the members can enter.'), validate, TournamentController.reopen);
    router.post('/:id/cancel', requireClubAdmin, id, validate, TournamentController.cancel);
    router.put('/:id/entries/:playerId', requireClubAdmin, id, param('playerId').isMongoId().withMessage('Invalid player.'), answer, validate, TournamentController.answerFor);
    router.post('/:id/draw', requireClubAdmin, id, body('seeding').optional().isIn(['seeded', 'random']).withMessage('Choose how the draw is held.'), validate, TournamentController.draw);
    router.put('/:id/matches/:match/result', requireClubAdmin, id, match, body('winner').isMongoId().withMessage('Choose the winner.'), validate, TournamentController.result);

    app.use('/api/tournaments', router);
};

// the links of the invitations: entering or declining without logging in
export const tournamentReplyRoutes = (app) => {
    app.get('/api/tournament-reply', TournamentController.replyLookup);
    app.post('/api/tournament-reply', body('answer').isIn(['in', 'out']).withMessage('Answer in or out.'), validate, TournamentController.reply);
};
