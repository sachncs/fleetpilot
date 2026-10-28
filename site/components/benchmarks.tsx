'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Gauge, Timer, ShieldCheck, Layers } from 'lucide-react';

type Row = {
  family: string;
  instance: string;
  customers: number;
  vehicles: number;
  makespan: number;
  runtimeMs: number;
  feasible: boolean;
};

const BENCHMARKS: Row[] = [
  { family: 'synthetic', instance: 'synth-10c-small.json', customers: 10, vehicles: 2, makespan: 379.24, runtimeMs: 41, feasible: true },
  { family: 'synthetic', instance: 'synth-20c-medium.json', customers: 20, vehicles: 3, makespan: 453.15, runtimeMs: 185, feasible: true },
  { family: 'cordeau', instance: 'mdvrp-2d-16c.json', customers: 16, vehicles: 4, makespan: 153.99, runtimeMs: 105, feasible: true },
  { family: 'cordeau', instance: 'mdvrp-3d-24c.json', customers: 24, vehicles: 6, makespan: 233.93, runtimeMs: 274, feasible: true },
  { family: 'cordeau', instance: 'mdvrp-3d-48c.json', customers: 48, vehicles: 6, makespan: 497.79, runtimeMs: 1357, feasible: true },
  { family: 'darp', instance: 'darp-12req-4veh.json', customers: 12, vehicles: 4, makespan: 250.64, runtimeMs: 68, feasible: true },
  { family: 'salhi-nagy', instance: 'vrpb-30c.json', customers: 30, vehicles: 3, makespan: 357.25, runtimeMs: 864, feasible: true },
  { family: 'lilim', instance: 'lc1_2_1.txt', customers: 106, vehicles: 50, makespan: 631.22, runtimeMs: 8895, feasible: true },
];

const SUMMARY = [
  { k: '8', label: 'Benchmark families', icon: Layers },
  { k: '350+', label: 'Tests · 85% coverage', icon: ShieldCheck },
  { k: '< 10s', label: '50-cust synthetic', icon: Timer },
  { k: '100%', label: 'Smoke feasibility', icon: Gauge },
];

export function Benchmarks(): React.ReactElement {
  return (
    <section
      id="benchmarks"
      className="shell relative py-24 sm:py-32"
      aria-labelledby="benchmarks-heading"
    >
      <div className="container-wide">
        <div className="mb-12 grid items-end gap-8 sm:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">— Performance</p>
            <h2
              id="benchmarks-heading"
              className="display text-[clamp(2rem,4vw,3.2rem)] leading-[1.04] font-medium tracking-[-0.035em]"
            >
              Numbers from a real
              <br />
              CI smoke run.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-[1.6] text-[var(--fg-soft)]">
            Reduced config (alns&nbsp;50 · pop&nbsp;100 · gen&nbsp;50) keeps
            the smoke under 30 seconds. Production defaults run 30k × 20k and
            converge deeper.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {SUMMARY.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.5,
                delay: i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] p-5"
            >
              <s.icon
                className="mb-4 size-4 text-[var(--accent)]"
                strokeWidth={1.75}
              />
              <div className="display text-[28px] font-medium tracking-tight">
                {s.k}
              </div>
              <div className="mt-1 text-[12px] text-[var(--fg-muted)]">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
                benchmarks/results/smoke-results.json
              </span>
            </div>
            <span className="chip">8 rows</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[10px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                  <th className="px-5 py-3 font-medium">Family</th>
                  <th className="px-5 py-3 font-medium">Instance</th>
                  <th className="px-5 py-3 text-right font-medium">Customers</th>
                  <th className="px-5 py-3 text-right font-medium">Vehicles</th>
                  <th className="px-5 py-3 text-right font-medium">Makespan</th>
                  <th className="px-5 py-3 text-right font-medium">Runtime</th>
                  <th className="px-5 py-3 text-right font-medium">Feasible</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS.map((r) => (
                  <tr
                    key={r.instance}
                    className="border-b border-[var(--line)]/60 transition-colors last:border-b-0 hover:bg-[color-mix(in_oklab,var(--fg)_3%,transparent)]"
                  >
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-[var(--fg)]">
                        <span className="size-1.5 rounded-full bg-[var(--accent)]" />
                        {r.family}
                      </span>
                    </td>
                    <td className="mono px-5 py-3 text-[var(--fg-soft)]">
                      {r.instance}
                    </td>
                    <td className="mono px-5 py-3 text-right text-[var(--fg)]">
                      {r.customers}
                    </td>
                    <td className="mono px-5 py-3 text-right text-[var(--fg-soft)]">
                      {r.vehicles}
                    </td>
                    <td className="mono px-5 py-3 text-right text-[var(--fg)]">
                      {r.makespan.toFixed(2)}m
                    </td>
                    <td className="mono px-5 py-3 text-right text-[var(--fg-soft)]">
                      {r.runtimeMs < 1000
                        ? `${Math.round(r.runtimeMs)} ms`
                        : `${(r.runtimeMs / 1000).toFixed(2)} s`}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.feasible ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                          <span className="size-1 rounded-full bg-emerald-500" />
                          feasible
                        </span>
                      ) : (
                        <span className="text-[var(--fg-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] px-5 py-3 text-[12px] text-[var(--fg-muted)]">
            Reproduce locally with{' '}
            <code className="mono rounded bg-[var(--bg)] px-1.5 py-0.5 text-[var(--fg-soft)]">
              npm run test:coverage
            </code>{' '}
            — full suite in{' '}
            <a
              href="https://github.com/sachncs/fleetpilot/tree/master/benchmarks"
              target="_blank"
              rel="noreferrer noopener"
              className="text-[var(--fg-soft)] underline decoration-[var(--fg-faint)] underline-offset-4 hover:text-[var(--fg)]"
            >
              benchmarks/
            </a>
            .
          </div>
        </div>
      </div>
    </section>
  );
}