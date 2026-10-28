'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Terminal, Copy, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'install' | 'quickstart' | 'cli' | 'json';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'install', label: 'install' },
  { id: 'quickstart', label: 'quickstart.ts' },
  { id: 'cli', label: 'CLI' },
  { id: 'json', label: 'problem.json' },
];

const SNIPPETS: Record<Tab, { language: string; code: string }> = {
  install: {
    language: 'bash',
    code: `# from npm
npm install fleetpilot

# or from source
git clone https://github.com/sachncs/fleetpilot
cd fleetpilot && npm install`,
  },
  quickstart: {
    language: 'typescript',
    code: `import {
  FleetPilotSolver,
  Problem,
  LocationNode,
  Customer,
  Vehicle,
} from 'fleetpilot';

const nodes = {
  0: new LocationNode(0, 28.61, 77.23, 'Delhi Depot'),
  1: new LocationNode(1, 28.54, 77.20, 'Customer A · Drop'),
  2: new LocationNode(2, 28.56, 77.25, 'Customer A · Pick'),
};

const customers = [new Customer(1, 1, 2, 50)];
const vehicles = [new Vehicle(1, 5)];

const problem = new Problem(nodes, customers, vehicles, 0);
const solver = new FleetPilotSolver(problem);

const solution = await solver.solve({ maxTimeMs: 30_000 });
console.log(\`Best makespan: \${solution.makespan.toFixed(2)} min\`);
console.log(\`Feasible: \${solution.isFeasible()}\`);`,
  },
  cli: {
    language: 'bash',
    code: `# install the CLI
npm install -g fleetpilot

# solve a problem file
fleetpilot --problem problem.json --output solution.json

# stream progress while it runs
fleetpilot --problem problem.json --progress

# time-box the search
fleetpilot --problem problem.json --max-time 30000`,
  },
  json: {
    language: 'json',
    code: `{
  "nodes": [
    { "id": 0, "x": 28.61, "y": 77.23, "name": "Delhi Depot" },
    { "id": 1, "x": 28.54, "y": 77.20, "name": "Customer 1 Drop" },
    { "id": 2, "x": 28.56, "y": 77.25, "name": "Customer 1 Pick" }
  ],
  "customers": [
    { "id": 1, "deliveryNodeId": 1, "pickupNodeId": 2, "processingTime": 30 }
  ],
  "vehicles": [
    { "id": 1, "capacity": 100, "costPerKm": 12, "co2PerKm": 0.15 }
  ],
  "depotNodeId": 0
}`,
  },
};

export function CodePreview(): React.ReactElement {
  const [active, setActive] = React.useState<Tab>('quickstart');
  const [copied, setCopied] = React.useState(false);
  const snippet = SNIPPETS[active];

  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [snippet.code]);

  return (
    <section
      id="api"
      className="shell relative py-24 sm:py-32"
      aria-labelledby="api-heading"
    >
      <div className="container-wide">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow mb-3">— API</p>
            <h2
              id="api-heading"
              className="display text-[clamp(2rem,4vw,3.2rem)] leading-[1.04] font-medium tracking-[-0.035em]"
            >
              One solver.
              <br />
              <span
                className="italic text-[var(--fg-muted)]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Three surfaces.
              </span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-[1.6] text-[var(--fg-soft)]">
              Call it from TypeScript, run it from the CLI, or feed it a JSON
              file. Same engine, deterministic seed, predictable behavior across
              Node and the browser.
            </p>

            <ul className="mt-7 flex flex-col gap-2.5">
              {[
                ['Node.js', 'Primary runtime. worker_threads for parallelism.'],
                ['Browser', 'Web Worker bundle at fleetpilot/worker.'],
                ['CLI', 'fleetpilot binary in PATH after global install.'],
              ].map(([k, v]) => (
                <li
                  key={k}
                  className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] px-4 py-3"
                >
                  <span className="mono mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                    {k}
                  </span>
                  <span className="text-[13px] leading-[1.55] text-[var(--fg-soft)]">
                    {v}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="https://github.com/sachncs/fleetpilot#api"
              target="_blank"
              rel="noreferrer noopener"
              className="group mt-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--fg-soft)] hover:text-[var(--fg)]"
            >
              Full reference
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </a>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="surface overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4">
              <div
                role="tablist"
                aria-label="Code examples"
                className="-mb-px flex items-center gap-0.5 overflow-x-auto py-1"
              >
                {TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    role="tab"
                    aria-selected={active === tab.id}
                    onClick={() => setActive(tab.id)}
                    className={cn(
                      'relative whitespace-nowrap rounded-t-md px-3 py-2 text-[12px] font-medium transition-colors',
                      active === tab.id
                        ? 'text-[var(--fg)]'
                        : 'text-[var(--fg-muted)] hover:text-[var(--fg-soft)]',
                    )}
                  >
                    {tab.label}
                    {active === tab.id ? (
                      <motion.span
                        layoutId="tab-underline"
                        className="absolute inset-x-2 -bottom-px h-px bg-[var(--fg)]"
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onCopy}
                aria-label="Copy code"
                className="grid size-8 place-items-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-[color-mix(in_oklab,var(--fg)_5%,transparent)] hover:text-[var(--fg)]"
              >
                {copied ? (
                  <Check className="size-3.5" strokeWidth={2} />
                ) : (
                  <Copy className="size-3.5" strokeWidth={1.75} />
                )}
              </button>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_60%,transparent)] px-4 py-2">
                <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                  <Terminal className="size-3.5" strokeWidth={1.75} />
                  <span className="mono uppercase tracking-[0.16em]">
                    {snippet.language}
                  </span>
                </div>
                <span className="mono text-[11px] text-[var(--fg-faint)]">
                  ~{snippet.code.split('\n').length} lines
                </span>
              </div>
              <pre className="mono overflow-x-auto p-5 text-[12.5px] leading-[1.65] text-[var(--fg-soft)]">
                <code
                  dangerouslySetInnerHTML={{
                    __html: highlight(snippet.code, snippet.language),
                  }}
                />
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function highlight(code: string, lang: string): string {
  const escape = (s: string): string =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  let html = escape(code);

  const keyword = /\b(const|let|var|new|import|from|export|default|return|if|else|await|async|function|class|extends|implements|interface|type|public|private|protected|static|readonly|null|undefined|true|false|in|of|for|while|switch|case|break|continue|throw|try|catch|finally)\b/g;
  const string = /(['"`])((?:\\.|(?!\1).)*)\1/g;
  const number = /\b(\d[\d_]*(?:\.\d+)?)\b/g;
  const comment = /(\/\/[^\n]*|#[^\n]*)/g;
  const fn = /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g;
  const prop = /\.([a-zA-Z_$][\w$]*)/g;

  if (lang === 'json') {
    html = html
      .replace(/"([^"]+)"(?=\s*:)/g, '<span class="text-[var(--accent)]">"$1"</span>')
      .replace(
        /:\s*"([^"]*)"/g,
        ': <span class="text-[var(--color-aurora)]">"$1"</span>',
      )
      .replace(number, '<span class="text-[var(--color-amber-glow)]">$1</span>');
    return html;
  }

  if (lang === 'bash') {
    html = html
      .replace(comment, '<span class="text-[var(--fg-faint)]">$1</span>')
      .replace(
        /^(\s*)(npm|git|cd|npx|node|fleetpilot)(.*)$/gm,
        '$1<span class="text-[var(--accent)]">$2</span>$3',
      )
      .replace(
        /(--[a-z-]+)/g,
        '<span class="text-[var(--color-aurora)]">$1</span>',
      )
      .replace(string, '<span class="text-[var(--color-amber-glow)]">$1$2$1</span>');
    return html;
  }

  html = html
    .replace(comment, '<span class="text-[var(--fg-faint)]">$1</span>')
    .replace(string, '<span class="text-[var(--color-amber-glow)]">$1$2$1</span>')
    .replace(keyword, '<span class="text-[var(--accent)]">$1</span>')
    .replace(number, '<span class="text-[var(--color-iris)]">$1</span>')
    .replace(prop, '.<span class="text-[var(--color-aurora)]">$1</span>')
    .replace(fn, '<span class="text-[var(--fg)]">$1</span>');

  return html;
}