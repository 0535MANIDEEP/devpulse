import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initDb } from './db';
import monitorsRouter from './routes/monitors';
import checksRouter from './routes/checks';
import incidentsRouter from './routes/incidents';
import statsRouter from './routes/stats';
import { errorHandler } from './middleware/errorHandler';
import { startScheduler } from './services/scheduler';
import { initSocket } from './socket';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/monitors', monitorsRouter);
app.use('/api/monitors', checksRouter);
app.use('/api/monitors', incidentsRouter);
app.use('/api/monitors', statsRouter);

app.use(errorHandler);

async function start() {
  await initDb();
  
  if (require.main === module) {
    const httpServer = createServer(app);
    initSocket(httpServer);
    startScheduler();
    
    httpServer.listen(PORT, () => {
      console.log(`DevPulse server running on port ${PORT}`);
    });
  }
}

start().catch(console.error);

export { app };
