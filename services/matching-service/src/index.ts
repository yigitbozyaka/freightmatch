import express from 'express';
import mongoose from 'mongoose';
import { env } from './config/env';
import { matchingRouter } from './routes/matching.routes';
import { errorHandler } from './middlewares/error.middleware';
import { startConsumer, disconnectConsumer } from './kafka/consumer';

const app = express();
const PORT = env.PORT || 3004;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ service: 'matching-service', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'matching-service', timestamp: new Date().toISOString() });
});

app.use('/api/match', matchingRouter);

app.use(errorHandler);

async function startServer() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await startConsumer();

    app.listen(PORT, () => {
      console.log(`matching-service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down gracefully...');
  await disconnectConsumer();
  await mongoose.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
