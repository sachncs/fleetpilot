import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const distWorker = path.resolve(here, '..', 'dist', 'worker.js');

process.env['FLEETPILOT_WORKER_PATH'] = distWorker;
