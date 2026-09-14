'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles, Github, TerminalSquare } from 'lucide-react';

export function Hero(): React.ReactElement {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="shell relative pt-32 pb-24 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-32">
      <div className="shine" />
      <div className="grid-overlay" />
      <div className="container-wide">
        <div className="grid gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <div className="flex flex-col">
            <div className="chip mb-6">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-70" />
                <span className="relative inline-block size-1.5 rounded-full bg-[var(--accent)]" />
              </span>
              v2.0 · ALNS + BRKGA · ISC license
            </div>

            <h1 className="display text-[clamp(2.6rem,6.2vw,4.85rem)] leading-[0.95] font-medium tracking-[-0.04em] text-[var(--fg)]">
              Route optimization,
              <br />
              <span className="text-[var(--fg-muted)]">reimagined for</span>
              <br />
              <span
                className="italic"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                real fleets.
              </span>
            </h1>

            <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.55] text-[var(--fg-soft)]">
              FleetPilot is a two-stage metaheuristic (ALNS + BRKGA) solver for
              resource-constrained pickup-and-delivery — built for the chaos of
              Indian logistics, tuned for the discipline of production systems.
              Time windows, multi-depot, traffic-aware, fully deterministic.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="https://www.npmjs.com/package/fleetpilot"
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary"
              >
                <TerminalSquare className="size-4" strokeWidth={1.75} />
                npm install fleetpilot
              </Link>
              <Link
                href="https://github.com/sachncs/fleetpilot"
                target="_blank"
                rel="noreferrer noopener"
                className="btn-ghost"
              >
                <Github className="size-4" strokeWidth={1.75} />
                Star on GitHub
              </Link>
              <Link
                href="#api"
                className="group ml-1 inline-flex items-center gap-1 px-2 text-[13px] font-medium text-[var(--fg-soft)] hover:text-[var(--fg)]"
              >
                Read the API
                <ArrowRight
                  className="size-3.5 translate-x-0 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </Link>
            </div>

            <dl className="mt-14 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)]">
              {[
                { k: '≥ 30k', v: 'Population / solve', sub: 'BRKGA parallel islands' },
                { k: '500', v: 'ALNS iterations', sub: 'adaptive destroy / repair' },
                { k: '< 1 ms', v: 'Incremental checks', sub: 'O(1) RouteLoad decoder' },
              ].map((stat) => (
                <div
                  key={stat.k}
                  className="flex flex-col gap-1 bg-[var(--bg-elev)] p-5"
                >
                  <dt className="display text-2xl font-medium text-[var(--fg)]">
                    {stat.k}
                  </dt>
                  <dd className="text-[13px] font-medium text-[var(--fg-soft)]">
                    {stat.v}
                  </dd>
                  <dd className="text-[11px] text-[var(--fg-muted)]">
                    {stat.sub}
</dd>
              </div>
            ))}
          </dl>
          </div>

          <div className="relative">
            <HeroVisual reducedMotion={!!prefersReducedMotion} />
            <div className="mt-4 flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
              <span className="mono">
                synthetic-20c · makespan 453.15m · feasible
              </span>
              <span className="mono">live render</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroVisual({
  reducedMotion,
}: {
  reducedMotion: boolean;
}): React.ReactElement {
  const depot = { x: 110, y: 240 };
  const stops: Array<{ x: number; y: number; k: 'D' | 'P'; label: string }> = [
    { x: 230, y: 120, k: 'D', label: 'c1·D' },
    { x: 330, y: 200, k: 'P', label: 'c1·P' },
    { x: 460, y: 90, k: 'D', label: 'c2·D' },
    { x: 590, y: 220, k: 'P', label: 'c2·P' },
    { x: 180, y: 380, k: 'D', label: 'c3·D' },
    { x: 360, y: 420, k: 'P', label: 'c3·P' },
    { x: 540, y: 360, k: 'D', label: 'c4·D' },
    { x: 640, y: 460, k: 'P', label: 'c4·P' },
  ];

  const routeA = [depot, stops[0], stops[1], stops[4], stops[5], depot];
  const routeB = [depot, stops[2], stops[3], stops[6], stops[7], depot];

  const accentA = 'var(--accent)';
  const accentB = 'var(--color-aurora)';
  const gridPath = (pts: typeof routeA) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="surface relative overflow-hidden p-4 sm:p-6">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--accent)_18%,transparent)]">
            <Sparkles
              className="size-4 text-[var(--accent)]"
              strokeWidth={1.75}
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="display text-[15px] font-medium">Solve preview</span>
            <span className="text-[11px] text-[var(--fg-muted)]">
              20 customers · 3 vehicles · 2 routes shown
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="chip">
            <span className="size-1.5 rounded-full bg-[var(--accent)]" />
            Vehicle 01
          </span>
          <span className="chip">
            <span className="size-1.5 rounded-full bg-[var(--color-aurora)]" />
            Vehicle 02
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_80%,transparent)]">
        <svg
          viewBox="0 0 760 540"
          className="block h-auto w-full"
          role="img"
          aria-label="Animated route visualization showing two vehicle routes"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="var(--grid)"
                strokeWidth="1"
              />
            </pattern>
            <linearGradient id="route-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accentA} stopOpacity="0.95" />
              <stop offset="100%" stopColor={accentA} stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="route-b" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor={accentB} stopOpacity="0.95" />
              <stop offset="100%" stopColor={accentB} stopOpacity="0.5" />
            </linearGradient>
            <radialGradient id="halo" cx="50%" cy="50%" r="50%">
              <stop
                offset="0%"
                stopColor="var(--accent)"
                stopOpacity="0.35"
              />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="760" height="540" fill="url(#grid)" />

          <g opacity="0.5">
            <circle cx="400" cy="260" r="220" fill="url(#halo)" />
          </g>

          <motion.path
            d={gridPath(routeA)}
            fill="none"
            stroke="url(#route-a)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 2.4, ease: 'easeInOut' }}
            style={
              reducedMotion
                ? undefined
                : { animation: 'dash-flow 1.6s linear infinite' }
            }
          />
          <motion.path
            d={gridPath(routeB)}
            fill="none"
            stroke="url(#route-b)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: reducedMotion ? 0 : 2.4,
              delay: reducedMotion ? 0 : 0.3,
              ease: 'easeInOut',
            }}
            style={
              reducedMotion
                ? undefined
                : {
                    animation: 'dash-flow 1.6s linear infinite',
                    animationDelay: '0.3s',
                  }
            }
          />

          {routeA.map((p, idx) => (
            <StopDot key={`a-${idx}`} point={p} color={accentA} pulse={idx === 1} />
          ))}
          {routeB.map((p, idx) => (
            <StopDot
              key={`b-${idx}`}
              point={p}
              color={accentB}
              pulse={idx === 1}
            />
          ))}

          <g>
            <rect
              x={depot.x - 18}
              y={depot.y - 18}
              width="36"
              height="36"
              rx="8"
              fill="var(--fg)"
            />
            <text
              x={depot.x}
              y={depot.y + 5}
              textAnchor="middle"
              fill="var(--bg)"
              fontSize="14"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              D0
            </text>
          </g>

          {stops.map((s) => (
            <g key={s.label}>
              <circle
                cx={s.x}
                cy={s.y}
                r="11"
                fill="var(--bg-elev)"
                stroke={s.k === 'D' ? accentA : accentB}
                strokeWidth="2"
              />
              <text
                x={s.x}
                y={s.y + 3}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill={s.k === 'D' ? accentA : accentB}
                fontFamily="var(--font-mono)"
              >
                {s.k}
              </text>
            </g>
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[color-mix(in_oklab,var(--bg-elev)_85%,transparent)] px-3 py-2 text-[11px] backdrop-blur-md">
          <span className="mono text-[var(--fg-muted)]">
            iter 1,247 / 500 · best 453.15m
          </span>
          <span className="mono inline-flex items-center gap-1.5 text-[var(--accent)]">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-block size-1.5 rounded-full bg-current" />
            </span>
            optimizing
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)]">
        {[
          { k: 'Feasible', v: '✓' },
          { k: 'Customers', v: '20' },
          { k: 'Runtime', v: '185 ms' },
        ].map((m) => (
          <div
            key={m.k}
            className="flex items-center justify-between bg-[var(--bg-elev)] px-4 py-3 text-[12px]"
          >
            <span className="text-[var(--fg-muted)]">{m.k}</span>
            <span className="mono font-medium text-[var(--fg)]">{m.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StopDot({
  point,
  color,
  pulse,
}: {
  point: { x: number; y: number };
  color: string;
  pulse?: boolean;
}): React.ReactElement {
  return (
    <g>
      <circle
        cx={point.x}
        cy={point.y}
        r="5"
        fill={color}
        opacity="0.35"
        style={
          pulse ? { animation: 'halo-glow 2.4s ease-in-out infinite' } : undefined
        }
      />
      <circle cx={point.x} cy={point.y} r="3" fill={color} />
    </g>
  );
}