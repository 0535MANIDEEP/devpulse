import { initDb, getDb, closeDb } from '../src/db';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test.db');

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

describe('Database', () => {
  it('should initialize the database', () => {
    const db = getDb();
    expect(db).toBeDefined();
  });

  it('should have monitors table', () => {
    const db = getDb();
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='monitors'");
    expect(result.length).toBe(1);
    expect(result[0].values[0][0]).toBe('monitors');
  });

  it('should have checks table', () => {
    const db = getDb();
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='checks'");
    expect(result.length).toBe(1);
    expect(result[0].values[0][0]).toBe('checks');
  });

  it('should have incidents table', () => {
    const db = getDb();
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='incidents'");
    expect(result.length).toBe(1);
    expect(result[0].values[0][0]).toBe('incidents');
  });

  it('should have correct indexes', () => {
    const db = getDb();
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
    const indexNames = result[0].values.map((row: any[]) => row[0]);
    expect(indexNames).toContain('idx_checks_monitor_id');
    expect(indexNames).toContain('idx_checks_checked_at');
    expect(indexNames).toContain('idx_incidents_monitor_id');
  });
});
