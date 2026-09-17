import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db';
import { validate } from '../middleware/validate';
import { Monitor, MonitorWithStatus } from '../types';

const router = Router();

const createMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL format'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
  expected_status: z.number().int().min(100).max(599).default(200),
  check_interval_seconds: z.number().int().min(10).max(3600).default(60)
});

const updateMonitorSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  expected_status: z.number().int().min(100).max(599).optional(),
  check_interval_seconds: z.number().int().min(10).max(3600).optional(),
  is_active: z.number().int().min(0).max(1).optional()
});

function getMonitorWithStatus(monitor: Monitor, db: any): MonitorWithStatus {
  const latestCheck = db.exec(
    `SELECT status_code, response_time_ms, is_success, checked_at 
     FROM checks WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT 1`,
    [monitor.id]
  );

  const uptime24h = db.exec(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success
     FROM checks 
     WHERE monitor_id = ? AND checked_at >= datetime('now', '-24 hours')`,
    [monitor.id]
  );

  const avgResponseTime = db.exec(
    `SELECT AVG(response_time_ms) 
     FROM checks 
     WHERE monitor_id = ? AND is_success = 1 AND response_time_ms IS NOT NULL
       AND checked_at >= datetime('now', '-24 hours')`,
    [monitor.id]
  );

  let latestStatus: 'up' | 'down' | 'unknown' = 'unknown';
  let latestCheckAt: string | null = null;
  let uptimePercentage: number | null = null;
  let avgResponse: number | null = null;

  if (latestCheck.length > 0 && latestCheck[0].values.length > 0) {
    const row = latestCheck[0].values[0];
    latestStatus = row[2] === 1 ? 'up' : 'down';
    latestCheckAt = row[3] as string;
  }

  if (uptime24h.length > 0 && uptime24h[0].values.length > 0) {
    const row = uptime24h[0].values[0];
    const total = row[0] as number;
    const success = row[1] as number;
    if (total > 0) {
      uptimePercentage = (success / total) * 100;
    }
  }

  if (avgResponseTime.length > 0 && avgResponseTime[0].values.length > 0) {
    avgResponse = avgResponseTime[0].values[0][0] as number;
  }

  return {
    ...monitor,
    latest_status: latestStatus,
    latest_check_at: latestCheckAt,
    uptime_24h: uptimePercentage,
    avg_response_time: avgResponse
  };
}

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const activeOnly = req.query.active === 'true';
    
    let query = 'SELECT * FROM monitors';
    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY created_at DESC';

    const result = db.exec(query);
    
    if (result.length === 0) {
      res.json([]);
      return;
    }

    const monitors: Monitor[] = result[0].values.map((row: any[]) => ({
      id: row[0],
      name: row[1],
      url: row[2],
      method: row[3],
      expected_status: row[4],
      check_interval_seconds: row[5],
      is_active: row[6],
      created_at: row[7],
      updated_at: row[8]
    }));

    const monitorsWithStatus = monitors.map(m => getMonitorWithStatus(m, db));
    res.json(monitorsWithStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monitors' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    
    const result = db.exec('SELECT * FROM monitors WHERE id = ?', [id]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    const row = result[0].values[0];
    const monitor: Monitor = {
      id: row[0],
      name: row[1],
      url: row[2],
      method: row[3],
      expected_status: row[4],
      check_interval_seconds: row[5],
      is_active: row[6],
      created_at: row[7],
      updated_at: row[8]
    };

    const monitorWithStatus = getMonitorWithStatus(monitor, db);
    res.json(monitorWithStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monitor' });
  }
});

router.post('/', validate(createMonitorSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { name, url, method, expected_status, check_interval_seconds } = req.body;

    db.run(
      `INSERT INTO monitors (name, url, method, expected_status, check_interval_seconds) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, url, method, expected_status, check_interval_seconds]
    );

    const result = db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];

    const newMonitor = db.exec('SELECT * FROM monitors WHERE id = ?', [id]);
    const row = newMonitor[0].values[0];

    res.status(201).json({
      id: row[0],
      name: row[1],
      url: row[2],
      method: row[3],
      expected_status: row[4],
      check_interval_seconds: row[5],
      is_active: row[6],
      created_at: row[7],
      updated_at: row[8]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create monitor' });
  }
});

router.put('/:id', validate(updateMonitorSchema), (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);

    const existing = db.exec('SELECT * FROM monitors WHERE id = ?', [id]);
    if (existing.length === 0 || existing[0].values.length === 0) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.run(`UPDATE monitors SET ${updates.join(', ')} WHERE id = ?`, values);

    const updated = db.exec('SELECT * FROM monitors WHERE id = ?', [id]);
    const row = updated[0].values[0];

    res.json({
      id: row[0],
      name: row[1],
      url: row[2],
      method: row[3],
      expected_status: row[4],
      check_interval_seconds: row[5],
      is_active: row[6],
      created_at: row[7],
      updated_at: row[8]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update monitor' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);

    const existing = db.exec('SELECT * FROM monitors WHERE id = ?', [id]);
    if (existing.length === 0 || existing[0].values.length === 0) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    db.run('DELETE FROM checks WHERE monitor_id = ?', [id]);
    db.run('DELETE FROM incidents WHERE monitor_id = ?', [id]);
    db.run('DELETE FROM monitors WHERE id = ?', [id]);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete monitor' });
  }
});

export default router;
