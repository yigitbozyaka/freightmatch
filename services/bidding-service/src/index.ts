import express from 'express';
import mongoose from 'mongoose';
import { env } from './config/env';
import { bidRouter } from './routes/bid.routes';
import { errorHandler } from './middlewares/error.middleware';
import { connectProducer, disconnectProducer } from './kafka/producer';

const app = express();
const PORT = env.PORT || 3003;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ service: 'bidding-service', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bidding-service', timestamp: new Date().toISOString() });
});

app.use('/api/bids', bidRouter);

app.use(errorHandler);

async function startServer() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await connectProducer();

    app.listen(PORT, () => {
      console.log(`bidding-service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down gracefully...');
  await disconnectProducer();
  await mongoose.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
