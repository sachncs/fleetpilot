import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { getPubSub } from './pubsub';
import type { WorkerMessage } from '../worker/ipc';

/**
 * Attaches the solve-progress WebSocket endpoint (/ws/progress/:jobId).
 *
 * Unmatched upgrades are intentionally left untouched (NOT destroyed):
 * Next.js registers its own 'upgrade' listener (HMR in dev) on the same
 * server and needs to receive them.
 */
export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  const pubsub = getPubSub();

  server.on('upgrade', (request, socket, head) => {
    const match = (request.url ?? '').match(/^\/ws\/progress\/([^/]+)$/);
    if (!match) return;

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
