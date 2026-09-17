import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

router.get('/:id/checks', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const monitorId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const from = req.query.from as string;
    const to = req.query.to as string;

    let query = 'SELECT * FROM checks WHERE monitor_id = ?';
    const params: any[] = [monitorId];

    if (from) {
      query += ' AND checked_at >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND checked_at <= ?';
      params.push(to);
    }

    query += ' ORDER BY checked_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = db.exec(query, params);

    if (result.length === 0) {
      res.json([]);
      return;
    }

    const checks = result[0].values.map((row: any[]) => ({
      id: row[0],
      monitor_id: row[1],
      status_code: row[2],
      response_time_ms: row[3],
      is_success: row[4],
      error_message: row[5],
      checked_at: row[6]
    }));

    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checks' });
  }
});

export default router;
