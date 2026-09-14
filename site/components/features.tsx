'use client';

import * as React from 'react';
import {
  Clock4,
  Building2,
  TrafficCone,
  ArrowLeftRight,
  GitBranch,
  Boxes,
  BarChart3,
  Cable,
  Cog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Feature = {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: 'iris' | 'aurora' | 'amber' | 'indigo';
  span?: 'tall' | 'wide';
};

const FEATURES: Feature[] = [
  {
    title: 'Resource-constrained pickup-and-delivery',
    body: 'Each customer has a delivery node, a pickup node, and a processing window. Pickup cannot start until delivery completes — even across vehicles.',
    icon: ArrowLeftRight,
    accent: 'iris',
    span: 'wide',
  },
  {
    title: 'Time windows',
    body: 'Earliest / latest delivery and pickup per customer. Soft penalties keep the search honest; feasibility flags surface violations.',
    icon: Clock4,
    accent: 'aurora',
  },
  {
    title: 'Multi-depot',
    body: 'Vehicles may start and end at different depots. Auto-detected from your problem JSON — no flag-flipping required.',
    icon: Building2,
    accent: 'indigo',
  },
  {
    title: 'Traffic-aware routing',
    body: 'Time-dependent travel times via a pluggable traffic model. Tune rush-hour multipliers per segment, simulate realistic congestion.',
    icon: TrafficCone,
    accent: 'amber',
  },
  {
    title: 'Inter-vehicle transfers',
    body: 'Exchange resources at hub nodes. Concurrency limits, directional permissions, transfer durations — all configurable.',
    icon: Cable,
    accent: 'iris',
  },
  {
    title: 'Multi-objective',
    body: 'Pareto-optimal fronts across makespan, distance, cost, and CO₂. Compare solutions with `SolutionComparator`.',
    icon: GitBranch,
    accent: 'aurora',
  },
  {
    title: 'Parallel solvers',
    body: 'Run ALNS and BRKGA concurrently via `worker_threads`. For evolutionary scale, enable island-model BRKGA with elite migration.',
    icon: Boxes,
    accent: 'indigo',
    span: 'wide',
  },
  {
    title: 'Analytics & GIS export',
    body: 'Vehicle utilization, wait times, load profiles. GeoJSON, KML, and CSV — drop into QGIS, Google Earth, or Excel.',
    icon: BarChart3,
    accent: 'amber',
  },
  {
    title: 'Deterministic by default',
    body: 'Seeded mulberry32 RNG. Same problem, same solution — across runs, machines, and CI.',
    icon: Cog,
    accent: 'iris',
  },
];

const ACCENT_CLASSES: Record<
  Feature['accent'],
  { bg: string; ring: string; fg: string; line: string }
> = {
  iris: {
    bg: 'bg-[color-mix(in_oklab,var(--color-iris)_14%,transparent)]',
    ring: 'ring-[color-mix(in_oklab,var(--color-iris)_30%,transparent)]',
    fg: 'text-[var(--color-iris)]',
    line: 'from-[var(--color-iris)]/0 via-[var(--color-iris)]/40 to-[var(--color-iris)]/0',
  },
  aurora: {
    bg: 'bg-[color-mix(in_oklab,var(--color-aurora)_18%,transparent)]',
    ring: 'ring-[color-mix(in_oklab,var(--color-aurora)_30%,transparent)]',
    fg: 'text-[var(--color-aurora)]',
    line: 'from-[var(--color-aurora)]/0 via-[var(--color-aurora)]/40 to-[var(--color-aurora)]/0',
  },
  amber: {
    bg: 'bg-[color-mix(in_oklab,var(--color-amber-glow)_16%,transparent)]',
    ring: 'ring-[color-mix(in_oklab,var(--color-amber-glow)_30%,transparent)]',
    fg: 'text-[var(--color-amber-glow)]',
    line: 'from-[var(--color-amber-glow)]/0 via-[var(--color-amber-glow)]/40 to-[var(--color-amber-glow)]/0',
  },
  indigo: {
    bg: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]',
    ring: 'ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]',
    fg: 'text-[var(--accent)]',
    line: 'from-[var(--accent)]/0 via-[var(--accent)]/40 to-[var(--accent)]/0',
  },
};

export function Features(): React.ReactElement {
  return (
    <section
      id="features"
      className="shell relative py-24 sm:py-32"
      aria-labelledby="features-heading"
    >
      <div className="container-wide">
        <div className="mb-14 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">— Capabilities</p>
            <h2
              id="features-heading"
              className="display text-[clamp(2rem,4vw,3.2rem)] leading-[1.02] font-medium tracking-[-0.035em]"
            >
              Engineered for the parts of
              <br />
              routing that don&rsquo;t fit on a slide.
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-[1.55] text-[var(--fg-soft)]">
            Every feature is in the public API — no flag-flipping,
            no proprietary modules, no &ldquo;enterprise edition&rdquo;. The same
            solver that ships on npm is what your CI runs.
          </p>
        </div>

        <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }): React.ReactElement {
  const accent = ACCENT_CLASSES[feature.accent];
  const Icon = feature.icon;
  const isWide = feature.span === 'wide';
  const isTall = feature.span === 'tall';

  return (
    <article
      className={cn(
        'group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-6 transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-[var(--fg-faint)]',
        isWide && 'sm:col-span-2 lg:col-span-2',
        isTall && 'sm:row-span-2',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-0 transition-opacity duration-500 group-hover:opacity-100',
          accent.line,
        )}
      />

      <div className="flex items-start justify-between">
        <div
          className={cn(
            'grid size-10 place-items-center rounded-xl ring-1',
            accent.bg,
            accent.ring,
            accent.fg,
          )}
        >
          <Icon className="size-[18px]" strokeWidth={1.6} />
        </div>
        <span className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
          {String(FEATURES.indexOf(feature) + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        <h3 className="display mb-2 text-[18px] font-medium tracking-tight text-[var(--fg)]">
          {feature.title}
        </h3>
        <p className="text-[14px] leading-[1.6] text-[var(--fg-soft)]">
          {feature.body}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
        <span className="mono uppercase tracking-[0.16em]">public api</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium',
            accent.fg,
          )}
        >
          <span className="size-1 rounded-full bg-current" />
          ready
        </span>
      </div>
    </article>
  );
}