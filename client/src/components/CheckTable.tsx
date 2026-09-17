import { Check } from '../api/client';

interface CheckTableProps {
  checks: Check[];
}

export function CheckTable({ checks }: CheckTableProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white text-lg font-semibold mb-4">Check History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-2">Time</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Response</th>
              <th className="pb-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.id} className="border-b border-gray-700 text-gray-300">
                <td className="py-2">{new Date(check.checked_at).toLocaleString()}</td>
                <td className="py-2">{check.status_code || '-'}</td>
                <td className="py-2">{check.response_time_ms ? `${check.response_time_ms}ms` : '-'}</td>
                <td className="py-2">
                  {check.is_success === 1 ? (
                    <span className="text-green-400">Success</span>
                  ) : (
                    <span className="text-red-400" title={check.error_message || ''}>Failed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
