interface StatusBadgeProps {
  status: 'up' | 'down' | 'unknown';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
  
  const statusClasses = {
    up: 'bg-green-900 text-green-300',
    down: 'bg-red-900 text-red-300',
    unknown: 'bg-gray-700 text-gray-300'
  };

  return (
    <span className={`${baseClasses} ${statusClasses[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
