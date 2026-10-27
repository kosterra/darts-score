import { Router } from 'express';
import { param } from 'express-validator';
import { validate } from '../utils/validation.js';
import * as NotificationController from '../controllers/notification.controller.js';

// the notifications of the logged-in user
export default (app) => {
    const router = Router();

    router.get('/', NotificationController.findMine);
    router.get('/unread', NotificationController.unread);
    router.get('/settings', NotificationController.settings);
    router.put('/settings', NotificationController.saveSettings);
    router.put('/read', NotificationController.readAll);
    router.put('/:id/read', param('id').isMongoId(), validate, NotificationController.read);
    router.delete('/', NotificationController.removeAll);
    router.delete('/:id', param('id').isMongoId(), validate, NotificationController.remove);

    app.use('/api/notifications', router);
};

// the links in the mails to get no more of them: no login needed
export const unsubscribeRoutes = (app) => {
    app.get('/api/unsubscribe', NotificationController.unsubscribeInfo);
    app.post('/api/unsubscribe', NotificationController.unsubscribe);
};
