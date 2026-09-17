import express from 'express';
import cors from 'cors';
import { initDb } from './db';
import monitorsRouter from './routes/monitors';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/monitors', monitorsRouter);

app.use(errorHandler);

async function start() {
  await initDb();
  
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`DevPulse server running on port ${PORT}`);
    });
  }
}

start().catch(console.error);

export { app };
