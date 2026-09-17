import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export function emitCheckCompleted(data: {
  monitorId: number;
  status: number | null;
  responseTime: number | null;
  isCheckedAt: string;
  isSuccess: boolean;
}): void {
  if (io) {
    io.emit('check:completed', data);
  }
}

export function emitIncidentCreated(data: {
  monitorId: number;
  incidentId: number;
  errorMessage: string | null;
  startedAt: string;
}): void {
  if (io) {
    io.emit('incident:created', data);
  }
}

export function emitIncidentResolved(data: {
  monitorId: number;
  incidentId: number;
  resolvedAt: string;
}): void {
  if (io) {
    io.emit('incident:resolved', data);
  }
}
