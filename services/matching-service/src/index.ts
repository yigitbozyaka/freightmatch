import express from 'express';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ service: 'matching-service', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'matching-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`matching-service running on port ${PORT}`);
});
