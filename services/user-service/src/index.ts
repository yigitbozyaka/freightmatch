import { env } from './config/env';
import express, { Request, Response, NextFunction } from 'express';
import { connectDB, isDBConnected } from './config/db';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { ErrorCode } from './types';

const app = express();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: isDBConnected() ? 'ok' : 'error',
    },
  });
});

app.use('/api/users', authRoutes);
app.use('/api/users', userRoutes);

app.use((err: Error & { statusCode?: number; errorCode?: string }, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || ErrorCode.INTERNAL_ERROR;

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    error: errorCode,
    message: statusCode === 500 ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
  });
});

connectDB().then(() => {
  app.listen(Number(env.PORT), () => {
    console.log(`user-service running on port ${env.PORT}`);
  });
});
