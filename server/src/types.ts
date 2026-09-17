export interface Monitor {
  id: number;
  name: string;
  url: string;
  method: string;
  expected_status: number;
  check_interval_seconds: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Check {
  id: number;
  monitor_id: number;
  status_code: number | null;
  response_time_ms: number | null;
  is_success: number;
  error_message: string | null;
  checked_at: string;
}

export interface Incident {
  id: number;
  monitor_id: number;
  started_at: string;
  resolved_at: string | null;
  error_message: string | null;
}

export interface MonitorWithStatus extends Monitor {
  latest_status: 'up' | 'down' | 'unknown';
  latest_check_at: string | null;
  uptime_24h: number | null;
  avg_response_time: number | null;
}
