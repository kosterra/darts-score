import { validationResult } from 'express-validator';
import logger from '../models/logger.model.js';

/**
 * Central express-validator middleware.
 * Collects all validation errors and returns a 422 with the full list.
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req).formatWith(({ msg }) => msg);
    if (!errors.isEmpty()) {
        logger.debug({ validationErrors: errors.array() }, 'Validation failed');
        return res.status(422).json({ errors: errors.array() });
    }
    next();
};
