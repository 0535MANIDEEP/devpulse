import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { calculateUptime, getMonitorStatus } from '../services/uptime';

const router = Router();

router.get('/:id/stats', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const monitorId = parseInt(req.params.id);

    const monitor = db.exec('SELECT * FROM monitors WHERE id = ?', [monitorId]);
    if (monitor.length === 0 || monitor[0].values.length === 0) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    const uptime24h = calculateUptime(monitorId, 24);
    const uptime7d = calculateUptime(monitorId, 168);
    const uptime30d = calculateUptime(monitorId, 720);
    const status = getMonitorStatus(monitorId);

    const recentIncidents = db.exec(
      `SELECT * FROM incidents 
       WHERE monitor_id = ? 
       ORDER BY started_at DESC LIMIT 5`,
      [monitorId]
    );

    const incidents = recentIncidents.length > 0 
      ? recentIncidents[0].values.map((row: any[]) => ({
          id: row[0],
          monitor_id: row[1],
          started_at: row[2],
          resolved_at: row[3],
          error_message: row[4]
        }))
      : [];

    res.json({
      status,
      uptime: {
        '24h': uptime24h,
        '7d': uptime7d,
        '30d': uptime30d
      },
      recentIncidents: incidents
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
