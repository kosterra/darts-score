const pino = require('pino');

// Create a logging instance
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'debug',
    formatters: {
      bindings: (bindings) => {
        return { pid: bindings.pid, host: bindings.hostname };
      },
      level: (label) => {
        return { severity: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime
  },
  //pino.destination(`${__dirname}/application.log`)
);

module.exports = logger