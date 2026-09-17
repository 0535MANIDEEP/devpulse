import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { monitorsApi, checksApi, incidentsApi, Monitor, Check, Incident } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { UptimeChart } from '../components/UptimeChart';
import { CheckTable } from '../components/CheckTable';

export function MonitorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    try {
      const [monitorRes, checksRes, incidentsRes] = await Promise.all([
        monitorsApi.get(parseInt(id)),
        checksApi.list(parseInt(id), { limit: 50 }),
        incidentsApi.list(parseInt(id))
      ]);
      
      setMonitor(monitorRes.data);
      setChecks(checksRes.data);
      setIncidents(incidentsRes.data);
    } catch (error) {
      console.error('Failed to fetch monitor:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this monitor?')) return;
    
    try {
      await monitorsApi.delete(parseInt(id));
      navigate('/');
    } catch (error) {
      console.error('Failed to delete monitor:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Monitor not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold">{monitor.name}</h1>
            <p className="text-gray-400 mt-1">{monitor.url}</p>
          </div>
          <div className="flex gap-4">
            <StatusBadge status={monitor.latest_status} />
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">24h Uptime</div>
            <div className="text-2xl font-bold">
              {monitor.uptime_24h !== null ? `${monitor.uptime_24h.toFixed(1)}%` : '-'}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Avg Response Time</div>
            <div className="text-2xl font-bold">
              {monitor.avg_response_time ? `${Math.round(monitor.avg_response_time)}ms` : '-'}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Last Checked</div>
            <div className="text-2xl font-bold">
              {monitor.latest_check_at ? new Date(monitor.latest_check_at).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <UptimeChart checks={checks} />
        </div>

        <div className="mb-8">
          <CheckTable checks={checks} />
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white text-lg font-semibold mb-4">Incidents</h3>
          {incidents.length === 0 ? (
            <p className="text-gray-400">No incidents recorded</p>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-red-400 font-medium">
                        {incident.error_message || 'Unknown error'}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        Started: {new Date(incident.started_at).toLocaleString()}
                      </div>
                      {incident.resolved_at && (
                        <div className="text-green-400 text-sm">
                          Resolved: {new Date(incident.resolved_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={incident.resolved_at ? 'up' : 'down'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
