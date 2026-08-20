import * as readline from 'node:readline';
import { randomBytes } from 'node:crypto';
import { type FleetPilotConfig, saveConfig } from './config-store';
import { hashApiKey } from './db/seed';

function ask(rl: readline.Interface, question: string, defaultValue: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${question} [${defaultValue}]: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

export async function runOnboarding(): Promise<FleetPilotConfig> {
  console.log('');
  console.log('  Welcome to FleetPilot!');
  console.log('  First-time setup — this will only take a moment.');
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const port = await ask(rl, '  Server port', '3000');
  const maxConcurrentSolves = await ask(rl, '  Max concurrent solves', '1');
  const maxTimeMs = await ask(rl, '  Max solver time in ms (1000-600000)', '30000');
  const maxGenerations = await ask(rl, '  Max solver generations (1-50000)', '500');

  rl.close();

  const rawKey = `fp_${randomBytes(32).toString('hex')}`;
  const keyHash = hashApiKey(rawKey);

  const config: FleetPilotConfig = {
    dataDir: (await import('./config-store')).loadConfig().dataDir,
    databasePath: '', // set by loadConfig
    port: Math.max(1, Math.min(65535, Number(port))),
    maxConcurrentSolves: Math.max(1, Math.min(8, Number(maxConcurrentSolves))),
    maxTimeMs: Math.max(1000, Math.min(600_000, Number(maxTimeMs))),
    maxGenerations: Math.max(1, Math.min(50_000, Number(maxGenerations))),
    initialApiKeyHash: keyHash,
  };

  saveConfig(config);

  console.log('');
  console.log('  Setup complete!');
  console.log(`  Config saved to: ${config.dataDir}/fleetpilot.json`);
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────┐');
  console.log(`  │  Your API key:  ${rawKey}  │`);
  console.log('  │  Save this key — it will not be shown again.       │');
  console.log('  └─────────────────────────────────────────────────────┘');
  console.log('');

  return config;
}
