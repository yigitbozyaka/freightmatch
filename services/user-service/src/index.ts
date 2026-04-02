import { env } from './config/env';
import express, { Request, Response, NextFunction } from 'express';
import { connectDB, isDBConnected } from './config/db';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import carrierRoutes from './routes/carrier.routes';
import { ErrorCode } from './types';
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

process.env.SERVICE_NAME = 'user-service';
initTracing();

const app = express();

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
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

const healthCheck = createHealthCheck('user-service', '1.0.0');

app.get('/health', async (_req: Request, res: Response) => {
  const health = await healthCheck();
  mongoConnectionStatus.set(isDBConnected() ? 1 : 0);
  const { status, body } = formatHealthResponse(health);
  res.status(status).json(body);
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', getContentType());
  res.end(await getMetrics());
});

app.use('/api/users', authRoutes);
app.use('/api/users/carriers', carrierRoutes);
app.use('/api/users', userRoutes);

app.use((err: Error & { statusCode?: number; errorCode?: string }, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || ErrorCode.INTERNAL_ERROR;

  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    statusCode,
    errorCode,
  });

  res.status(statusCode).json({
    error: errorCode,
    message: statusCode === 500 ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
  });
});

connectDB().then(() => {
  logger.info('user-service connected to MongoDB');
  app.listen(Number(env.PORT), () => {
    logger.info(`user-service running on port ${env.PORT}`);
  });
});
