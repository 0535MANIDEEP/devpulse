import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

router.get('/:id/incidents', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const monitorId = parseInt(req.params.id);

    const result = db.exec(
      'SELECT * FROM incidents WHERE monitor_id = ? ORDER BY started_at DESC',
      [monitorId]
    );

    if (result.length === 0) {
      res.json([]);
      return;
    }

    const incidents = result[0].values.map((row: any[]) => ({
      id: row[0],
      monitor_id: row[1],
      started_at: row[2],
      resolved_at: row[3],
      error_message: row[4]
    }));

    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

export default router;
