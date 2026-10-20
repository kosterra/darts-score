import { Router } from 'express';
import { validate } from '../utils/validation.js';
import { validateX01Create } from '../validators/game.validators.js';
import * as TrainingController from '../controllers/x01.training.controller.js';
import { getX01TrainingStats } from '../controllers/x01.stats.controller.js';
import db from '../models/db.model.js';

// X01 trainings against the bot, within the selected club
export default (app) => {
    const router = Router();

    router.post('/', validateX01Create, validate, TrainingController.create);
    router.get('/', TrainingController.findByPlayer);
    router.get('/:id', TrainingController.findOne);
    router.get('/:id/stats', async (req, res, next) => {
        const found = db.mongoose.isValidObjectId(req.params.id) && await db.x01Training.exists({ _id: req.params.id, club: req.club._id });
        if (!found) return res.status(404).json({ message: 'Training not found.' });
        next();
    }, getX01TrainingStats);
    router.put('/:id', validateX01Create, validate, TrainingController.update);
    router.delete('/:id', TrainingController.remove);

    app.use('/api/training/x01', router);
};
