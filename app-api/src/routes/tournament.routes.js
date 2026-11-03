import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import { requireClubAdmin } from '../middleware/auth.middleware.js';
import * as TournamentController from '../controllers/tournament.controller.js';
import { MATCH_ID } from '../rules/tournaments.js';
import { MAX_BOARDS } from '../rules/boards.js';
import { sendLimiter, tvCode } from './screen.routes.js';

// the tournaments of the selected club: its admins run them, its members enter and play
export default (app) => {
    const router = Router();
    const id = param('id').isMongoId().withMessage('Invalid tournament.');
    // a match of the bracket ("8-0") or of a group ("g0-1-2")
    const match = param('match').matches(MATCH_ID).withMessage('Invalid match.');
    const answer = body('status').isIn(['in', 'out']).withMessage('Answer in or out.');

    router.get('/', TournamentController.list);
    router.get('/:id', id, validate, TournamentController.findOne);
    router.put('/:id/entry', id, answer, validate, TournamentController.answerMine);
    router.post('/:id/matches/:match/start', id, match, body('first').optional({ values: 'null' }).isMongoId(), validate, TournamentController.start);
    // the big screen of the boards: a link, or sent to a TV by its code
    router.post('/:id/boards/screen', id, validate, TournamentController.boardsScreenLink);
    router.post('/:id/boards/screen/send', sendLimiter, id, tvCode, validate, TournamentController.boardsScreenSend);

    // the club's admins
    const boardCount = (field) => body(field).optional().isInt({ min: 0, max: MAX_BOARDS }).withMessage(`Choose 0 to ${MAX_BOARDS} boards.`).toInt();
    router.post('/', requireClubAdmin, boardCount('boards.count'), validate, TournamentController.create);
    router.put('/:id', requireClubAdmin, id, boardCount('boards.count'), validate, TournamentController.update);
    router.delete('/:id', requireClubAdmin, id, validate, TournamentController.remove);
    router.post('/:id/open', requireClubAdmin, id, validate, TournamentController.open);
    router.post('/:id/close', requireClubAdmin, id, validate, TournamentController.close);
    router.post('/:id/reopen', requireClubAdmin, id, body('closesAt').isISO8601().withMessage('Choose until when the members can enter.'), validate, TournamentController.reopen);
    router.post('/:id/cancel', requireClubAdmin, id, validate, TournamentController.cancel);
    router.put('/:id/entries/:playerId', requireClubAdmin, id, param('playerId').isMongoId().withMessage('Invalid player.'), answer, validate, TournamentController.answerFor);
    router.post('/:id/draw', requireClubAdmin, id,
        body('seeding').optional().isIn(['seeded', 'random']).withMessage('Choose how the draw is held.'),
        // groups + knockout: how large the groups are made and how many of each go on
        body('groupSize').optional({ values: 'null' }).isInt({ min: 3, max: 6 }).withMessage('Groups have 3 to 6 players.').toInt(),
        body('advance').optional({ values: 'null' }).isInt({ min: 1, max: 5 }).withMessage('Choose how many of each group go on.').toInt(),
        validate, TournamentController.draw);
    router.put('/:id/matches/:match/result', requireClubAdmin, id, match, body('winner').isMongoId().withMessage('Choose the winner.'), validate, TournamentController.result);
    // on boards: how many and those taken out, a match moved to a board or held back
    router.put('/:id/boards', requireClubAdmin, id,
        body('count').isInt({ min: 0, max: MAX_BOARDS }).withMessage(`Choose 0 to ${MAX_BOARDS} boards.`).toInt(),
        body('out').optional().isArray({ max: MAX_BOARDS }).withMessage('Choose the boards taken out.'),
        body('out.*').isInt({ min: 1, max: MAX_BOARDS }).withMessage('Choose the boards taken out.').toInt(),
        validate, TournamentController.boards);
    router.put('/:id/matches/:match/board', requireClubAdmin, id, match, body('board').isInt({ min: 1, max: MAX_BOARDS }).withMessage('Choose a board.').toInt(), validate, TournamentController.board);
    router.put('/:id/matches/:match/held', requireClubAdmin, id, match, body('held').isBoolean({ strict: true }).withMessage('Hold the match back or not.').toBoolean(true), validate, TournamentController.held);

    app.use('/api/tournaments', router);
};

// the links of the invitations: entering or declining without logging in
export const tournamentReplyRoutes = (app) => {
    app.get('/api/tournament-reply', TournamentController.replyLookup);
    app.post('/api/tournament-reply', body('answer').isIn(['in', 'out']).withMessage('Answer in or out.'), validate, TournamentController.reply);
};
