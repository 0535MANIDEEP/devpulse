import { calculateUptime, getMonitorStatus } from '../src/services/uptime';
import { initDb, getDb, closeDb } from '../src/db';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test-uptime.db');

beforeAll(async () => {
  process.env.DATABASE_PATH = TEST_DB_PATH;
  await initDb();
});

afterAll(() => {
  closeDb();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('Uptime Service', () => {
  let monitorId: number;

  beforeEach(() => {
    const db = getDb();
    db.run(`INSERT INTO monitors (name, url, method, expected_status, check_interval_seconds) 
            VALUES (?, ?, ?, ?, ?)`,
      ['Test Monitor', 'https://httpbin.org/status/200', 'GET', 200, 60]);
    const result = db.exec('SELECT last_insert_rowid()');
    monitorId = result[0].values[0][0] as number;
  });

  afterEach(() => {
    const db = getDb();
    db.run('DELETE FROM checks');
    db.run('DELETE FROM incidents');
    db.run('DELETE FROM monitors');
  });

  it('should calculate uptime with mixed success/failure', () => {
    const db = getDb();
    
    for (let i = 0; i < 8; i++) {
      db.run(
        `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, checked_at) 
         VALUES (?, 200, 100, 1, datetime('now', '-' || ? || ' hours'))`,
        [monitorId, i]
      );
    }
    
    for (let i = 0; i < 2; i++) {
      db.run(
        `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, error_message, checked_at) 
         VALUES (?, 500, null, 0, 'Server error', datetime('now', '-' || ? || ' hours'))`,
        [monitorId, i + 8]
      );
    }

    const stats = calculateUptime(monitorId, 24);
    
    expect(stats.totalChecks).toBe(10);
    expect(stats.successfulChecks).toBe(8);
    expect(stats.failedChecks).toBe(2);
    expect(stats.uptimePercentage).toBe(80);
  });

  it('should return null uptime with no checks', () => {
    const stats = calculateUptime(monitorId, 24);
    
    expect(stats.totalChecks).toBe(0);
    expect(stats.uptimePercentage).toBeNull();
    expect(stats.averageResponseTime).toBeNull();
  });

  it('should calculate average response time', () => {
    const db = getDb();
    
    db.run(
      `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, checked_at) 
       VALUES (?, 200, 100, 1, datetime('now'))`,
      [monitorId]
    );
    db.run(
      `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, checked_at) 
       VALUES (?, 200, 200, 1, datetime('now'))`,
      [monitorId]
    );
    db.run(
      `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, checked_at) 
       VALUES (?, 200, 300, 1, datetime('now'))`,
      [monitorId]
    );

    const stats = calculateUptime(monitorId, 24);
    
    expect(stats.averageResponseTime).toBe(200);
  });

  it('should return "unknown" status with no checks', () => {
    const status = getMonitorStatus(monitorId);
    expect(status).toBe('unknown');
  });

  it('should return "up" status with latest successful check', () => {
    const db = getDb();
    
    db.run(
      `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, checked_at) 
       VALUES (?, 200, 100, 1, datetime('now'))`,
      [monitorId]
    );

    const status = getMonitorStatus(monitorId);
    expect(status).toBe('up');
  });

  it('should return "down" status with latest failed check', () => {
    const db = getDb();
    
    db.run(
      `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, checked_at) 
       VALUES (?, 200, 100, 1, datetime('now', '-2 hours'))`,
      [monitorId]
    );
    db.run(
      `INSERT INTO checks (monitor_id, status_code, response_time_ms, is_success, checked_at) 
       VALUES (?, 500, null, 0, datetime('now'))`,
      [monitorId]
    );

    const status = getMonitorStatus(monitorId);
    expect(status).toBe('down');
  });
});
