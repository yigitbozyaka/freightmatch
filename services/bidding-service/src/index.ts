import express from 'express';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ service: 'bidding-service', status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bidding-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`bidding-service running on port ${PORT}`);
});
