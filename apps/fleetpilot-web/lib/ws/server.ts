import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Server } from 'node:http';
import { getPubSub } from './pubsub';
import type { WorkerMessage } from '../worker/ipc';

export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  const pubsub = getPubSub();

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = request.url ?? '';
    const match = url.match(/^\/ws\/progress\/([^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const jobId = match[1]!;
      (ws as WebSocket & { _jobId?: string })._jobId = jobId;
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    const jobId = (ws as WebSocket & { _jobId?: string })._jobId;
    if (!jobId) {
      ws.close();
      return;
    }

    const unsubscribe = pubsub.subscribe(jobId, (msg: WorkerMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    });

    ws.on('close', () => {
      unsubscribe();
    });

    ws.on('error', () => {
      unsubscribe();
    });
  });

  return wss;
}
