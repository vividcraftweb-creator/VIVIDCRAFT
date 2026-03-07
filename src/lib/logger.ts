import pino from 'pino';

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Create base logger configuration
const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  // In development, use pretty printing
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      },
    },
  }),
  // In production, output JSON for log aggregation
  ...(isProduction && {
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  }),
  // Add base fields to all logs
  base: {
    env: process.env.NODE_ENV,
    ...(isProduction && {
      app: 'jobhorizons',
      version: process.env.npm_package_version
    }),
  },
  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'secret',
      'token',
      'authorization',
      'cookie',
      '*.password',
      '*.secret',
      '*.token',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },
  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

// Create child loggers for different modules
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Export default logger
export default logger;

// Utility functions for common log patterns
export const loggers = {
  api: createLogger('api'),
  db: createLogger('database'),
  auth: createLogger('auth'),
  payment: createLogger('payment'),
  email: createLogger('email'),
  cron: createLogger('cron'),
  webhook: createLogger('webhook'),
  fraud: createLogger('fraud'),
  storage: createLogger('storage'),
};

// Helper function to log API requests
export const logApiRequest = (req: Request, context?: Record<string, unknown>) => {
  loggers.api.info({
    method: req.method,
    url: req.url,
    headers: {
      userAgent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
    },
    ...context,
  }, 'API Request');
};

// Helper function to log API errors
export const logApiError = (error: Error, req?: Request, context?: Record<string, unknown>) => {
  loggers.api.error({
    error,
    ...(req && {
      method: req.method,
      url: req.url,
    }),
    ...context,
  }, 'API Error');
};

// Helper function to log database operations
export const logDatabaseOperation = (operation: string, table: string, context?: Record<string, unknown>) => {
  loggers.db.debug({
    operation,
    table,
    ...context,
  }, `Database ${operation}`);
};
