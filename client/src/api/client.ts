import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

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
  latest_status: 'up' | 'down' | 'unknown';
  latest_check_at: string | null;
  uptime_24h: number | null;
  avg_response_time: number | null;
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

export interface MonitorStats {
  status: 'up' | 'down' | 'unknown';
  uptime: {
    '24h': { uptimePercentage: number | null; totalChecks: number; successfulChecks: number; failedChecks: number; averageResponseTime: number | null };
    '7d': { uptimePercentage: number | null; totalChecks: number; successfulChecks: number; failedChecks: number; averageResponseTime: number | null };
    '30d': { uptimePercentage: number | null; totalChecks: number; successfulChecks: number; failedChecks: number; averageResponseTime: number | null };
  };
  recentIncidents: Incident[];
}

export const monitorsApi = {
  list: (activeOnly?: boolean) => 
    api.get<Monitor[]>('/monitors', { params: { active: activeOnly } }),
  
  get: (id: number) => 
    api.get<Monitor>(`/monitors/${id}`),
  
  create: (data: { name: string; url: string; method?: string; expected_status?: number; check_interval_seconds?: number }) =>
    api.post<Monitor>('/monitors', data),
  
  update: (id: number, data: Partial<Monitor>) =>
    api.put<Monitor>(`/monitors/${id}`, data),
  
  delete: (id: number) =>
    api.delete(`/monitors/${id}`)
};

export const checksApi = {
  list: (monitorId: number, params?: { limit?: number; offset?: number; from?: string; to?: string }) =>
    api.get<Check[]>(`/monitors/${monitorId}/checks`, { params })
};

export const incidentsApi = {
  list: (monitorId: number) =>
    api.get<Incident[]>(`/monitors/${monitorId}/incidents`)
};

export const statsApi = {
  get: (monitorId: number) =>
    api.get<MonitorStats>(`/monitors/${monitorId}/stats`)
};

export default api;
