import http from 'http';
import https from 'https';
import { getDb, saveDb } from '../db';
import { Monitor } from '../types';

interface HealthCheckResult {
  monitorId: number;
  statusCode: number | null;
  responseTimeMs: number;
  isSuccess: boolean;
  errorMessage: string | null;
  checkedAt: string;
}

function makeRequest(url: string, method: string, timeout: number = 10000): Promise<{ statusCode: number; responseTimeMs: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        timeout: timeout,
        headers: {
          'User-Agent': 'DevPulse/1.0'
        }
      },
      (res) => {
        const responseTimeMs = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode || 0,
          responseTimeMs
        });
        res.resume();
      }
    );

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function retryWithBackoff(
  url: string,
  method: string,
  maxRetries: number = 3
): Promise<{ statusCode: number; responseTimeMs: number }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await makeRequest(url, method);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function healthCheck(monitor: Monitor): Promise<HealthCheckResult> {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    const result = await retryWithBackoff(monitor.url, monitor.method);
    const isSuccess = result.statusCode === monitor.expected_status ? 1 : 0;

    db.run(
      `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, checked_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [monitor.id, result.statusCode, result.responseTimeMs, isSuccess, now]
    );

    if (isSuccess === 0) {
      const openIncident = db.exec(
        `SELECT id FROM incidents 
         WHERE monitor_id = ? AND resolved_at IS NULL 
         ORDER BY started_at DESC LIMIT 1`,
        [monitor.id]
      );

      if (openIncident.length === 0 || openIncident[0].values.length === 0) {
        db.run(
          `INSERT INTO incidents (monitor_id, started_at, error_message) 
           VALUES (?, ?, ?)`,
          [monitor.id, now, `Expected status ${monitor.expected_status}, got ${result.statusCode}`]
        );
      }
    } else {
      const openIncident = db.exec(
        `SELECT id FROM incidents 
         WHERE monitor_id = ? AND resolved_at IS NULL 
         ORDER BY started_at DESC LIMIT 1`,
        [monitor.id]
      );

      if (openIncident.length > 0 && openIncident[0].values.length > 0) {
        const incidentId = openIncident[0].values[0][0];
        db.run(
          `UPDATE incidents SET resolved_at = ? WHERE id = ?`,
          [now, incidentId]
        );
      }
    }

    saveDb();

    return {
      monitorId: monitor.id,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      isSuccess: isSuccess === 1,
      errorMessage: null,
      checkedAt: now
    };
  } catch (error) {
    const errorMessage = (error as Error).message;

    db.run(
      `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, error_message, checked_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [monitor.id, null, null, 0, errorMessage, now]
    );

    const openIncident = db.exec(
      `SELECT id FROM incidents 
       WHERE monitor_id = ? AND resolved_at IS NULL 
       ORDER BY started_at DESC LIMIT 1`,
      [monitor.id]
    );

    if (openIncident.length === 0 || openIncident[0].values.length === 0) {
      db.run(
        `INSERT INTO incidents (monitor_id, started_at, error_message) 
         VALUES (?, ?, ?)`,
        [monitor.id, now, errorMessage]
      );
    }

    saveDb();

    return {
      monitorId: monitor.id,
      statusCode: null,
      responseTimeMs: 0,
      isSuccess: false,
      errorMessage,
      checkedAt: now
    };
  }
}
