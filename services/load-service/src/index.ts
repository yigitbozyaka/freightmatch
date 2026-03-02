import express from 'express';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ service: 'load-service', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'load-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`load-service running on port ${PORT}`);
});
