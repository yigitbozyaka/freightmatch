import express from 'express';
import mongoose from 'mongoose';
import { env } from './config/env';
import { loadRouter } from './routes/load.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();
const PORT = env.PORT || 3002;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ service: 'load-service', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'load-service', timestamp: new Date().toISOString() });
});

app.use('/api/loads', loadRouter);

app.use(errorHandler);

async function startServer() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`load-service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
