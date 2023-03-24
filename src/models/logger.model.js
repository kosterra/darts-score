const pino = require('pino');

// Create a logging instance
const logger = pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    formatters: {
        level: (label) => {
          return { level: label };
        },
    },
});
  
module.exports = logger