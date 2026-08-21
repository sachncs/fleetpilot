import { createServer } from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import next from 'next';
import { ensureSchema } from './lib/db/migrate';
import { seedDefaultApiKey } from './lib/db/seed';
import { startWorker, onWorkerMessage, stopWorker } from './lib/worker/spawn';
import { getPubSub } from './lib/ws/pubsub';
import { attachWebSocket } from './lib/ws/server';
import { config, reloadConfig } from './lib/config';
import { isFirstRun } from './lib/config-store';
import { runOnboarding } from './lib/onboarding';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  if (isFirstRun()) {
    await runOnboarding();
    reloadConfig();
  }

  const dev = process.env['NODE_ENV'] !== 'production';
  const hostname = '0.0.0.0';
  const port = config.port;

  console.log('[FleetPilot] Initializing database...');
  await ensureSchema();

  const defaultKey = await seedDefaultApiKey();
  if (defaultKey) {
    console.log(`[FleetPilot] Default API key: ${defaultKey}`);
    console.log('[FleetPilot] Save this key — it will not be shown again.');
  }

  console.log('[FleetPilot] Starting worker...');
  startWorker();

  const pubsub = getPubSub();
  onWorkerMessage((msg) => {
    const jobId = 'jobId' in msg ? msg.jobId : undefined;
    if (jobId) {
      pubsub.publish(jobId, msg);
    }
  });

  const app = next({ dev, dir: __dirname, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = attachWebSocket(server);

  server.listen(port, hostname, () => {
    console.log(`[FleetPilot] Ready on http://${hostname}:${port}`);
  });

  const shutdown = (): void => {
    console.log('\n[FleetPilot] Shutting down...');
    stopWorker();
    wss.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('unhandledRejection', (err) => {
    console.error('[FleetPilot] Unhandled rejection:', err);
  });
  process.on('uncaughtException', (err) => {
    console.error('[FleetPilot] Uncaught exception:', err);
    shutdown();
  });
}

main().catch((err) => {
  console.error('[FleetPilot] Fatal:', err);
  process.exit(1);
});
