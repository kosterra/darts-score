import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as DeletionRequestController from '../controllers/deletion.request.controller.js';

// players ask to delete a game they played; the others agree, the club admins decide
export default (app) => {
    const router = Router();
    const id = param('id').isMongoId();

    router.get('/', DeletionRequestController.findOpen);
    router.get('/:id', id, validate, DeletionRequestController.findOne);
    router.post('/',
        body('type').isIn(['x01', 'cricket', 'elimination', 'clock']).withMessage('Choose the game.'),
        body('game').isMongoId().withMessage('Choose the game.'),
        body('reason').optional().isString().isLength({ max: 300 }).withMessage('The reason is at most 300 characters.'),
        validate, DeletionRequestController.create);
    router.put('/:id/answer', id, body('agree').isBoolean({ strict: true }), validate, DeletionRequestController.answer);
    router.put('/:id/decide', id,
        body('delete').isBoolean({ strict: true }),
        body('note').optional().isString().isLength({ max: 300 }).withMessage('The note is at most 300 characters.'),
        validate, DeletionRequestController.decide);
    router.delete('/:id', id, validate, DeletionRequestController.withdraw);

    app.use('/api/games/deletion-requests', router);
};
