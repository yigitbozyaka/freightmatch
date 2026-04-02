import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(
      timestamp(),
      json()
    ),
  }),
];

// Add Loki transport if GRAFANA_LOKI_URL is configured
const lokiUrl = process.env.GRAFANA_LOKI_URL;
const lokiUsername = process.env.GRAFANA_LOKI_USERNAME;
const lokiPassword = process.env.GRAFANA_LOKI_PASSWORD;

if (lokiUrl) {
  // Dynamic import to handle optional dependency
  import('winston-loki').then(({ default: LokiTransport }) => {
    const lokiTransport = new LokiTransport({
      host: lokiUrl,
      labels: {
        app: 'freightmatch',
        service: process.env.SERVICE_NAME || 'unknown',
      },
      json: true,
      replaceTimestamp: false,
      onConnectionError: (err: Error) => {
        console.error('Loki connection error:', err);
      },
    });

    // Add basic auth if provided
    if (lokiUsername && lokiPassword) {
      (lokiTransport as unknown as { username: string; password: string }).username = lokiUsername;
      (lokiTransport as unknown as { username: string; password: string }).password = lokiPassword;
    }

    transports.push(lokiTransport);
  }).catch(() => {
    console.warn('winston-loki not available, skipping Loki transport');
  });
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'unknown',
  },
  transports,
});

export function createChildLogger(context: Record<string, unknown>): winston.Logger {
  return logger.child(context);
}
