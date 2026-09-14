'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Boxes, Play, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    title: 'Define the problem',
    body: 'Drop depots and customer stops on a map. Add customers with delivery + pickup nodes, processing times, optional time windows. Configure vehicles with capacity, cost, and CO₂ per km.',
    icon: MapPin,
    accent: 'var(--accent)',
  },
  {
    n: '02',
    title: 'Solve with the metaheuristic',
    body: 'Call `solve()` once. ALNS adapts destroy / repair operators across the search; BRKGA evolves a 4n-gene chromosome, warm-started from the ALNS solution. Parallel islands via worker threads.',
    icon: Boxes,
    accent: 'var(--color-aurora)',
  },
  {
    n: '03',
    title: 'Simulate and ship',
    body: 'Replay the solved routes on a map. Watch vehicles move, ETAs tick, deliveries flow into pickups. Export to GeoJSON, KML, or CSV — drop straight into QGIS or Google Earth.',
    icon: Play,
    accent: 'var(--color-iris)',
  },
];

export function HowItWorks(): React.ReactElement {
  return (
    <section
      id="workflow"
      className="shell relative py-24 sm:py-32"
      aria-labelledby="workflow-heading"
    >
      <div className="container-wide">
        <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow mb-3">— Workflow</p>
            <h2
              id="workflow-heading"
              className="display text-[clamp(2rem,4vw,3.2rem)] leading-[1.04] font-medium tracking-[-0.035em]"
            >
              From a map full of pins
              <br />
              to a dispatch-ready plan
              <br />
              <span
                className="italic text-[var(--fg-muted)]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                in three moves.
              </span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-[1.6] text-[var(--fg-soft)]">
              The web console lives at{' '}
              <a
                href="https://github.com/sachncs/fleetpilot#web-ui"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-[var(--fg-faint)] underline-offset-4 transition-colors hover:text-[var(--fg)] hover:decoration-[var(--fg)]"
              >
                frontend/
              </a>{' '}
              — but the solver behind it is the same npm package you can call
              from a backend in a single line.
            </p>
          </div>

          <ol className="relative space-y-6">
            <span
              aria-hidden="true"
              className="absolute left-[27px] top-2 bottom-2 hidden w-px bg-gradient-to-b from-[var(--line-strong)] via-[var(--line)] to-transparent sm:block"
            />
            {STEPS.map((step, i) => (
              <Step key={step.n} step={step} index={i} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Step({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}): React.ReactElement {
  const Icon = step.icon;
  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative flex items-start gap-5 rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-5 sm:p-6"
    >
      <div
        className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--bg)]"
        style={{ color: step.accent }}
      >
        <Icon className="size-6" strokeWidth={1.5} />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            step {step.n}
          </span>
        </div>
        <h3 className="display mt-1 text-[19px] font-medium tracking-tight text-[var(--fg)]">
          {step.title}
        </h3>
        <p className="mt-2 max-w-prose text-[14px] leading-[1.6] text-[var(--fg-soft)]">
          {step.body}
        </p>
      </div>
      {index === STEPS.length - 1 ? null : (
        <ArrowRight
          className="absolute right-5 top-5 hidden size-4 text-[var(--fg-faint)] sm:block"
          strokeWidth={1.75}
        />
      )}
    </motion.li>
  );
}