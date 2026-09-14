'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Workflow, Binary, Thermometer, Layers } from 'lucide-react';

export function Algorithms(): React.ReactElement {
  return (
    <section
      id="algorithms"
      className="shell relative overflow-hidden py-24 sm:py-32"
      aria-labelledby="algorithms-heading"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />
      <div className="container-wide">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="eyebrow mb-3">— Under the hood</p>
          <h2
            id="algorithms-heading"
            className="display text-[clamp(2rem,4vw,3.2rem)] leading-[1.04] font-medium tracking-[-0.035em]"
          >
            Two stages, one winner.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.6] text-[var(--fg-soft)]">
            FleetPilot pairs Adaptive Large Neighborhood Search with a
            Biased Random-Key Genetic Algorithm — each stage sharpening the
            other.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AlgorithmCard
            tag="Stage 01"
            name="ALNS"
            subtitle="Adaptive Large Neighborhood Search"
            description="Destroy / repair metaheuristic. Six destroy operators (Shaw, random, worst, route, proximity, string) and four repair operators (greedy, regret-2, regret-3, sequential). Operator weights adapt every segment via reinforcement learning."
            points={[
              ['Simulated annealing', 'Worsening moves accepted with exp(Δ/T); T decays geometrically.'],
              ['Multi-restart', 'Up to 3 restarts on stagnation; temperature halved, weights zeroed.'],
              ['Adaptive sizing', 'Removal fraction grows 10% → 45% as stagnation deepens.'],
            ]}
            accent="var(--accent)"
            icon={Workflow}
            visual={<AlnsVisual />}
          />
          <AlgorithmCard
            tag="Stage 02"
            name="BRKGA"
            subtitle="Biased Random-Key Genetic Algorithm"
            description="Evolutionary search over a 4n-gene chromosome (priorities, assignments, dependencies, transfers). Each child inherits each gene from the elite parent with probability 0.7."
            points={[
              ['Warm-start', 'ALNS seeds 15% of the BRKGA initial population.'],
              ['Island model', 'Multi-population parallel BRKGA with elite migration via worker_threads.'],
              ['Stagnation resistance', 'Elite mutation, adaptive mutant injection, immigrant replacement.'],
            ]}
            accent="var(--color-aurora)"
            icon={Binary}
            visual={<BrkgaVisual />}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MathChip
            label="ALNS acceptance"
            formula="P = exp((c − c′) / T)"
            note="Simulated annealing"
            icon={Thermometer}
          />
          <MathChip
            label="ALNS weights"
            formula="wᵢ ← (1−λ)wᵢ + λ·(sᵢ/uᵢ)"
            note="λ = 0.1, segment size 50"
            icon={Workflow}
          />
          <MathChip
            label="BRKGA crossover"
            formula="child[i] = elite[i] w.p. 0.7"
            note="Biased toward elite"
            icon={Binary}
          />
          <MathChip
            label="Decoder"
            formula="O(1) RouteLoad"
            note="Incremental capacity check"
            icon={Layers}
          />
        </div>
      </div>
    </section>
  );
}

function AlgorithmCard({
  tag,
  name,
  subtitle,
  description,
  points,
  accent,
  icon: Icon,
  visual,
}: {
  tag: string;
  name: string;
  subtitle: string;
  description: string;
  points: [string, string][];
  accent: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  visual: React.ReactNode;
}): React.ReactElement {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="surface relative flex flex-col gap-6 overflow-hidden p-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 size-72 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklab, ${accent} 22%, transparent), transparent)`,
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="grid size-9 place-items-center rounded-lg"
            style={{
              color: accent,
              background: `color-mix(in oklab, ${accent} 14%, transparent)`,
            }}
          >
            <Icon className="size-[18px]" strokeWidth={1.6} />
          </span>
          <span className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            {tag}
          </span>
        </div>
        <span
          className="mono text-[11px] uppercase tracking-[0.18em]"
          style={{ color: accent }}
        >
          {name}
        </span>
      </div>

      <div>
        <h3 className="display text-[28px] font-medium leading-tight tracking-[-0.03em]">
          {subtitle}
        </h3>
        <p className="mt-3 max-w-prose text-[14px] leading-[1.65] text-[var(--fg-soft)]">
          {description}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_80%,transparent)]">
        {visual}
      </div>

      <ul className="flex flex-col gap-3">
        {points.map(([k, v]) => (
          <li key={k} className="flex items-start gap-3 text-[13px]">
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full"
              style={{ background: accent }}
            />
            <div className="flex flex-1 flex-col sm:flex-row sm:gap-3">
              <span className="font-medium text-[var(--fg)] sm:w-44">{k}</span>
              <span className="text-[var(--fg-soft)]">{v}</span>
            </div>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

function MathChip({
  label,
  formula,
  note,
  icon: Icon,
}: {
  label: string;
  formula: string;
  note: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-5">
      <div className="flex items-center gap-2 text-[var(--fg-muted)]">
        <Icon className="size-3.5" strokeWidth={1.75} />
        <span className="mono text-[10px] uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <div className="mono text-[14px] font-medium text-[var(--fg)]">
        {formula}
      </div>
      <div className="text-[11px] text-[var(--fg-muted)]">{note}</div>
    </div>
  );
}

function AlnsVisual(): React.ReactElement {
  return (
    <div className="p-5">
      <svg viewBox="0 0 600 180" className="h-32 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="alns-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <line
          x1="20"
          y1="120"
          x2="580"
          y2="120"
          stroke="var(--line)"
          strokeDasharray="2 4"
        />
        {[40, 90, 140, 200, 260, 330, 410, 490, 555].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={120 - Math.sin(i * 0.7) * 30 - i * 4}
            r="3.5"
            fill="var(--accent)"
            opacity={0.4 + (i / 12)}
          />
        ))}
        <motion.path
          d="M 20 130 L 80 110 L 140 90 L 200 60 L 260 70 L 330 40 L 410 50 L 490 30 L 555 25"
          fill="none"
          stroke="url(#alns-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
        <text
          x="20"
          y="160"
          fontFamily="var(--font-mono)"
          fontSize="10"
          fill="var(--fg-muted)"
        >
          iteration → makespan ↓
        </text>
      </svg>
    </div>
  );
}

function BrkgaVisual(): React.ReactElement {
  return (
    <div className="p-5">
      <svg viewBox="0 0 600 180" className="h-32 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="brkga-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-aurora)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-aurora)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {Array.from({ length: 9 }).map((_, r) => (
          <g key={r}>
            {Array.from({ length: 32 }).map((_, c) => {
              const seed = (r * 31 + c * 17) % 7;
              const lit = seed < 2;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={20 + c * 17.5}
                  y={20 + r * 14}
                  width="12"
                  height="8"
                  rx="2"
                  fill={lit ? 'var(--color-aurora)' : 'var(--line)'}
                  opacity={lit ? 0.85 : 0.5}
                />
              );
            })}
          </g>
        ))}
        <text
          x="20"
          y="170"
          fontFamily="var(--font-mono)"
          fontSize="10"
          fill="var(--fg-muted)"
        >
          chromosome (4n genes) · elite → mutant → crossover
        </text>
      </svg>
    </div>
  );
}