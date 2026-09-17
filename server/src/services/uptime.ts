import { getDb } from '../db';

interface UptimeStats {
  uptimePercentage: number | null;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number | null;
}

export function calculateUptime(monitorId: number, periodHours: number): UptimeStats {
  const db = getDb();

  const result = db.exec(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success,
       AVG(response_time_ms) as avg_response
     FROM checks 
     WHERE monitor_id = ? 
       AND checked_at >= datetime('now', '-' || ? || ' hours')`,
    [monitorId, periodHours]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return {
      uptimePercentage: null,
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: null
    };
  }

  const row = result[0].values[0];
  const total = row[0] as number;
  const success = row[1] as number;
  const avgResponse = row[2] as number;

  const uptimePercentage = total > 0 ? (success / total) * 100 : null;

  return {
    uptimePercentage,
    totalChecks: total,
    successfulChecks: success || 0,
    failedChecks: total - (success || 0),
    averageResponseTime: avgResponse
  };
}

export function getMonitorStatus(monitorId: number): 'up' | 'down' | 'unknown' {
  const db = getDb();

  const result = db.exec(
    `SELECT is_success FROM checks 
     WHERE monitor_id = ? 
     ORDER BY checked_at DESC LIMIT 1`,
    [monitorId]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return 'unknown';
  }

  return result[0].values[0][0] === 1 ? 'up' : 'down';
}
