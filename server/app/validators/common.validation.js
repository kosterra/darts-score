const { validationResult } = require('express-validator');
const logger = require("../models/logger.model");

const commonValidation = async  (req, res, next)=>{
    const error = validationResult(req).formatWith(({ msg }) => msg);;
    
    logger.debug(error);

    if (!error.isEmpty()) {
        return res.status(422).json({ error: error.array() });
    } else {
        next();
    }
}

module.exports = {
    commonValidation
}