import { getDb } from '../db';
import { healthCheck } from './healthCheck';
import { Monitor } from '../types';

const intervals: Map<number, NodeJS.Timeout> = new Map();

function getMonitorFromRow(row: any[]): Monitor {
  return {
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
}

function startMonitorInterval(monitor: Monitor): void {
  if (intervals.has(monitor.id)) {
    clearInterval(intervals.get(monitor.id)!);
  }

  const interval = setInterval(async () => {
    const db = getDb();
    const result = db.exec('SELECT * FROM monitors WHERE id = ? AND is_active = 1', [monitor.id]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      stopMonitorInterval(monitor.id);
      return;
    }

    const currentMonitor = getMonitorFromRow(result[0].values[0]);
    await healthCheck(currentMonitor);
  }, monitor.check_interval_seconds * 1000);

  intervals.set(monitor.id, interval);
}

function stopMonitorInterval(monitorId: number): void {
  const interval = intervals.get(monitorId);
  if (interval) {
    clearInterval(interval);
    intervals.delete(monitorId);
  }
}

export function startScheduler(): void {
  const db = getDb();
  const result = db.exec('SELECT * FROM monitors WHERE is_active = 1');

  if (result.length > 0) {
    const monitors: Monitor[] = result[0].values.map(getMonitorFromRow);
    monitors.forEach((monitor: Monitor) => startMonitorInterval(monitor));
  }

  console.log(`Scheduler started with ${intervals.size} monitors`);
}

export function stopScheduler(): void {
  intervals.forEach((interval, monitorId) => {
    clearInterval(interval);
  });
  intervals.clear();
  console.log('Scheduler stopped');
}

export function restartMonitorInterval(monitor: Monitor): void {
  if (monitor.is_active) {
    startMonitorInterval(monitor);
  } else {
    stopMonitorInterval(monitor.id);
  }
}

export function removeMonitorInterval(monitorId: number): void {
  stopMonitorInterval(monitorId);
}

export function getActiveIntervals(): number[] {
  return Array.from(intervals.keys());
}
