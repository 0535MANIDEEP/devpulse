import { healthCheck } from '../src/services/healthCheck';
import { initDb, getDb, closeDb } from '../src/db';
import { Monitor } from '../src/types';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test-health.db');

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

describe('Health Check Service', () => {
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

  it('should record successful check', async () => {
    const db = getDb();
    const monitor = db.exec('SELECT * FROM monitors WHERE id = ?', [monitorId])[0].values[0];
    
    const result = await healthCheck({
      id: monitor[0],
      name: monitor[1],
      url: monitor[2],
      method: monitor[3],
      expected_status: monitor[4],
      check_interval_seconds: monitor[5],
      is_active: monitor[6],
      created_at: monitor[7],
      updated_at: monitor[8]
    });

    expect(result.isSuccess).toBe(true);
    expect(result.statusCode).toBe(200);

    const checks = db.exec('SELECT * FROM checks WHERE monitor_id = ?', [monitorId]);
    expect(checks.length).toBe(1);
    expect(checks[0].values[0][4]).toBe(1);
  });

  it('should record failed check when status code does not match', async () => {
    const db = getDb();
    db.run(`INSERT INTO monitors (name, url, method, expected_status, check_interval_seconds) 
            VALUES (?, ?, ?, ?, ?)`,
      ['Fail Monitor', 'https://httpbin.org/status/404', 'GET', 200, 60]);
    const result = db.exec('SELECT last_insert_rowid()');
    const failMonitorId = result[0].values[0][0];

    const monitor = db.exec('SELECT * FROM monitors WHERE id = ?', [failMonitorId])[0].values[0];
    
    const healthResult = await healthCheck({
      id: monitor[0],
      name: monitor[1],
      url: monitor[2],
      method: monitor[3],
      expected_status: monitor[4],
      check_interval_seconds: monitor[5],
      is_active: monitor[6],
      created_at: monitor[7],
      updated_at: monitor[8]
    });

    expect(healthResult.isSuccess).toBe(false);
    expect(healthResult.statusCode).toBe(404);

    const checks = db.exec('SELECT * FROM checks WHERE monitor_id = ?', [failMonitorId]);
    expect(checks.length).toBe(1);
    expect(checks[0].values[0][4]).toBe(0);
  });

  it('should record error message on network error', async () => {
    const db = getDb();
    db.run(`INSERT INTO monitors (name, url, method, expected_status, check_interval_seconds) 
            VALUES (?, ?, ?, ?, ?)`,
      ['Error Monitor', 'https://nonexistent.domain.example', 'GET', 200, 60]);
    const result = db.exec('SELECT last_insert_rowid()');
    const errorMonitorId = result[0].values[0][0];

    const monitor = db.exec('SELECT * FROM monitors WHERE id = ?', [errorMonitorId])[0].values[0];
    
    const healthResult = await healthCheck({
      id: monitor[0],
      name: monitor[1],
      url: monitor[2],
      method: monitor[3],
      expected_status: monitor[4],
      check_interval_seconds: monitor[5],
      is_active: monitor[6],
      created_at: monitor[7],
      updated_at: monitor[8]
    });

    expect(healthResult.isSuccess).toBe(false);
    expect(healthResult.errorMessage).toBeTruthy();

    const checks = db.exec('SELECT * FROM checks WHERE monitor_id = ?', [errorMonitorId]);
    expect(checks.length).toBe(1);
    expect(checks[0].values[0][4]).toBe(0);
    expect(checks[0].values[0][5]).toBeTruthy();
  }, 30000);

  it('should create incident on first failure', async () => {
    const db = getDb();
    db.run(`INSERT INTO monitors (name, url, method, expected_status, check_interval_seconds) 
            VALUES (?, ?, ?, ?, ?)`,
      ['Incident Monitor', 'https://httpbin.org/status/500', 'GET', 200, 60]);
    const result = db.exec('SELECT last_insert_rowid()');
    const incidentMonitorId = result[0].values[0][0];

    const monitor = db.exec('SELECT * FROM monitors WHERE id = ?', [incidentMonitorId])[0].values[0];
    
    await healthCheck({
      id: monitor[0],
      name: monitor[1],
      url: monitor[2],
      method: monitor[3],
      expected_status: monitor[4],
      check_interval_seconds: monitor[5],
      is_active: monitor[6],
      created_at: monitor[7],
      updated_at: monitor[8]
    });

    const incidents = db.exec('SELECT * FROM incidents WHERE monitor_id = ?', [incidentMonitorId]);
    expect(incidents.length).toBe(1);
    expect(incidents[0].values[0][3]).toBeNull();
  });

  it('should resolve incident on recovery', async () => {
    const db = getDb();
    
    db.run(`INSERT INTO incidents (monitor_id, started_at, error_message) 
            VALUES (?, datetime('now'), ?)`,
      [monitorId, 'Previous error']);

    const monitor = db.exec('SELECT * FROM monitors WHERE id = ?', [monitorId])[0].values[0];
    
    await healthCheck({
      id: monitor[0],
      name: monitor[1],
      url: monitor[2],
      method: monitor[3],
      expected_status: monitor[4],
      check_interval_seconds: monitor[5],
      is_active: monitor[6],
      created_at: monitor[7],
      updated_at: monitor[8]
    });

    const incidents = db.exec('SELECT * FROM incidents WHERE monitor_id = ?', [monitorId]);
    expect(incidents.length).toBe(1);
    expect(incidents[0].values[0][3]).toBeTruthy();
  });

  it('should not create duplicate incident if one is already open', async () => {
    const db = getDb();
    db.run(`INSERT INTO monitors (name, url, method, expected_status, check_interval_seconds) 
            VALUES (?, ?, ?, ?, ?)`,
      ['Duplicate Monitor', 'https://httpbin.org/status/500', 'GET', 200, 60]);
    const result = db.exec('SELECT last_insert_rowid()');
    const dupMonitorId = result[0].values[0][0];

    db.run(`INSERT INTO incidents (monitor_id, started_at, error_message) 
            VALUES (?, datetime('now'), ?)`,
      [dupMonitorId, 'Existing incident']);

    const monitor = db.exec('SELECT * FROM monitors WHERE id = ?', [dupMonitorId])[0].values[0];
    
    await healthCheck({
      id: monitor[0],
      name: monitor[1],
      url: monitor[2],
      method: monitor[3],
      expected_status: monitor[4],
      check_interval_seconds: monitor[5],
      is_active: monitor[6],
      created_at: monitor[7],
      updated_at: monitor[8]
    });

    const incidents = db.exec('SELECT * FROM incidents WHERE monitor_id = ?', [dupMonitorId]);
    expect(incidents.length).toBe(1);
  });
});
