import pino from 'pino';

// Whoever wants to keep warnings and errors (the error log) listens here
const warningListeners = new Set();

export const onWarningOrError = (listener) => {
  warningListeners.add(listener);
  return () => warningListeners.delete(listener);
};

const warningStream = {
  write: (line) => warningListeners.forEach(listener => listener(line)),
};

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'debug',
    formatters: {
      bindings: (bindings) => ({ pid: bindings.pid, host: bindings.hostname }),
      level: (label) => ({ severity: label.toUpperCase() }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream([
    { level: 'trace', stream: process.stdout },
    { level: 'warn', stream: warningStream },
  ])
);

export default logger;
