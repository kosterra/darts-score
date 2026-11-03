import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../utils/validation.js';
import { GOAL_KINDS, GOAL_TRAININGS, HISTORY_WEEKS, MAX_GOALS } from '../utils/practice.goals.js';
import * as PracticeGoalsController from '../controllers/practice.goals.controller.js';

// the weekly practice goals of the logged-in user, in all their clubs
export default (app) => {
    const router = Router();

    router.get('/', PracticeGoalsController.findMine);
    router.put('/',
        body('goals').isArray({ max: MAX_GOALS }).withMessage('You can set at most three goals.'),
        body('goals.*.id').optional({ values: 'null' }).isString().isLength({ max: 40 }).withMessage('The id of a goal is a short text.'),
        body('goals.*.kind').isIn(Object.keys(GOAL_KINDS)).withMessage('A goal needs what it counts.'),
        body('goals.*.target').isInt({ min: 1, max: 10000 }).withMessage('A goal needs a number from 1 to 10,000.'),
        body('goals.*.training').optional({ values: 'null' }).isIn(GOAL_TRAININGS).withMessage('Choose the training of the goal.'),
        body('goals.*.withBot').optional({ values: 'null' }).isBoolean().withMessage('Whether the bot counts is yes or no.'),
        validate,
        PracticeGoalsController.save
    );
    router.get('/history',
        query('weeks').optional().isInt({ min: 1, max: HISTORY_WEEKS }).withMessage('Ask for 1 to 26 weeks.'),
        validate,
        PracticeGoalsController.history
    );

    app.use('/api/goals', router);
};
