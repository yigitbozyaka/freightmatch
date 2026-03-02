import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ service: 'user-service', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`user-service running on port ${PORT}`);
});
