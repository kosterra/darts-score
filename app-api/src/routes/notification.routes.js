import { Router } from 'express';
import { param } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as NotificationController from '../controllers/notification.controller.js';

// the notifications of the logged-in user
export default (app) => {
    const router = Router();

    router.get('/', NotificationController.findMine);
    router.get('/unread', NotificationController.unread);
    router.put('/read', NotificationController.readAll);
    router.put('/:id/read', param('id').isMongoId(), validate, NotificationController.read);
    router.delete('/:id', param('id').isMongoId(), validate, NotificationController.remove);

    app.use('/api/notifications', router);
};
