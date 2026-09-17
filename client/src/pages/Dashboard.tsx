import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { monitorsApi, Monitor } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useWebSocket } from '../hooks/useWebSocket';

export function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonitors = useCallback(async () => {
    try {
      const response = await monitorsApi.list();
      setMonitors(response.data);
    } catch (error) {
      console.error('Failed to fetch monitors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 30000);
    return () => clearInterval(interval);
  }, [fetchMonitors]);

  useWebSocket({
    onCheckCompleted: (data) => {
      setMonitors(prev => prev.map(m => {
        if (m.id === data.monitorId) {
          return {
            ...m,
            latest_status: data.isSuccess ? 'up' : 'down',
            latest_check_at: data.isCheckedAt
          };
        }
        return m;
      }));
    }
  });

  const totalUp = monitors.filter(m => m.latest_status === 'up').length;
  const totalDown = monitors.filter(m => m.latest_status === 'down').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">DevPulse</h1>
          <Link
            to="/add"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Add Monitor
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Monitors</div>
            <div className="text-2xl font-bold">{monitors.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Up</div>
            <div className="text-2xl font-bold text-green-400">{totalUp}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Down</div>
            <div className="text-2xl font-bold text-red-400">{totalDown}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Unknown</div>
            <div className="text-2xl font-bold text-gray-400">
              {monitors.filter(m => m.latest_status === 'unknown').length}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-700">
                <th className="p-4">Name</th>
                <th className="p-4">URL</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Checked</th>
                <th className="p-4">Uptime (24h)</th>
                <th className="p-4">Response</th>
              </tr>
            </thead>
            <tbody>
              {monitors.map((monitor) => (
                <tr key={monitor.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="p-4">
                    <Link to={`/monitor/${monitor.id}`} className="text-blue-400 hover:text-blue-300">
                      {monitor.name}
                    </Link>
                  </td>
                  <td className="p-4 text-gray-400 text-sm truncate max-w-xs">{monitor.url}</td>
                  <td className="p-4">
                    <StatusBadge status={monitor.latest_status} />
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {monitor.latest_check_at
                      ? new Date(monitor.latest_check_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="p-4 text-gray-400">
                    {monitor.uptime_24h !== null
                      ? `${monitor.uptime_24h.toFixed(1)}%`
                      : '-'}
                  </td>
                  <td className="p-4 text-gray-400">
                    {monitor.avg_response_time
                      ? `${Math.round(monitor.avg_response_time)}ms`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
