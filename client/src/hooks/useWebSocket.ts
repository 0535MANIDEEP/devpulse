import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface CheckCompletedData {
  monitorId: number;
  status: number | null;
  responseTime: number | null;
  isCheckedAt: string;
  isSuccess: boolean;
}

interface IncidentCreatedData {
  monitorId: number;
  incidentId: number;
  errorMessage: string | null;
  startedAt: string;
}

interface IncidentResolvedData {
  monitorId: number;
  incidentId: number;
  resolvedAt: string;
}

interface UseWebSocketOptions {
  onCheckCompleted?: (data: CheckCompletedData) => void;
  onIncidentCreated?: (data: IncidentCreatedData) => void;
  onIncidentResolved?: (data: IncidentResolvedData) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setTimeout(connect, 3000);
    });

    if (options.onCheckCompleted) {
      socket.on('check:completed', options.onCheckCompleted);
    }

    if (options.onIncidentCreated) {
      socket.on('incident:created', options.onIncidentCreated);
    }

    if (options.onIncidentResolved) {
      socket.on('incident:resolved', options.onIncidentResolved);
    }

    socketRef.current = socket;
  }, [options]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connect]);

  return socketRef.current;
}
