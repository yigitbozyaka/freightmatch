import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { loadRouter } from './routes/load.routes';
import { errorHandler } from './middlewares/error.middleware';
import { connectProducer, disconnectProducer } from './kafka/producer';
import { startConsumer, disconnectConsumer } from './kafka/consumer';
import { apiRateLimiter } from './middlewares/rateLimit.middleware';
import {
  logger,
  initTracing,
  createHealthCheck,
  formatHealthResponse,
  getMetrics,
  getContentType,
  httpRequestDuration,
  httpRequestTotal,
  mongoConnectionStatus,
} from '@freightmatch/instrumentation';

process.env.SERVICE_NAME = 'load-service';
initTracing();

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '1mb' }));
app.disable('x-powered-by');

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode.toString() },
      duration
    );
    httpRequestTotal.inc({ method: req.method, route, status_code: res.statusCode.toString() });
  });
  next();
});

const healthCheck = createHealthCheck('load-service', '1.0.0');

app.get('/', (_req, res) => {
  res.json({ service: 'load-service', status: 'ok' });
});

app.get('/health', async (req, res) => {
  const health = await healthCheck();
  mongoConnectionStatus.set(mongoose.connection.readyState === 1 ? 1 : 0);
  const { status, body } = formatHealthResponse(health);
  res.status(status).json(body);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', getContentType());
  res.end(await getMetrics());
});

app.use('/api/loads', apiRateLimiter, loadRouter);

app.use(errorHandler);

async function startServer() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('load-service connected to MongoDB');

    await connectProducer();
    await startConsumer();

    app.listen(Number(env.PORT), () => {
      logger.info(`load-service running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('load-service shutting down');
  await disconnectProducer();
  await disconnectConsumer();
  await mongoose.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
