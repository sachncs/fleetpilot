'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Github, TerminalSquare, BookOpen } from 'lucide-react';

export function Cta(): React.ReactElement {
  return (
    <section className="shell relative py-24 sm:py-32">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="surface relative overflow-hidden p-8 sm:p-12 lg:p-16"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-80"
            style={{
              background:
                'radial-gradient(900px 500px at 80% 20%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 60%), radial-gradient(700px 400px at 10% 100%, color-mix(in oklab, var(--color-aurora) 18%, transparent), transparent 60%)',
            }}
          />
          <div className="grain opacity-30" />

          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
            <div>
              <p className="eyebrow mb-4">— Ship it</p>
              <h2 className="display text-[clamp(2rem,4vw,3.4rem)] leading-[1.04] font-medium tracking-[-0.035em]">
                Stop guessing routes.
                <br />
                <span
                  className="italic text-[var(--fg-muted)]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Start solving them.
                </span>
              </h2>
              <p className="mt-5 max-w-lg text-[15px] leading-[1.6] text-[var(--fg-soft)]">
                One npm install puts a production-grade metaheuristic in your
                backend. Bring your problem JSON, get a feasible plan back in
                seconds — with full GIS export and analytics out of the box.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <Link
                href="https://www.npmjs.com/package/fleetpilot"
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary justify-center text-[15px] sm:px-6"
              >
                <TerminalSquare className="size-4" strokeWidth={1.75} />
                npm install fleetpilot
                <ArrowUpRight className="size-4" strokeWidth={2} />
              </Link>
              <Link
                href="https://github.com/sachncs/fleetpilot"
                target="_blank"
                rel="noreferrer noopener"
                className="btn-ghost justify-center text-[15px] sm:px-6"
              >
                <Github className="size-4" strokeWidth={1.75} />
                Open repository
              </Link>
              <Link
                href="https://github.com/sachncs/fleetpilot#readme"
                target="_blank"
                rel="noreferrer noopener"
                className="group mt-1 inline-flex items-center gap-1.5 self-center text-[13px] font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)] lg:self-end"
              >
                <BookOpen className="size-3.5" strokeWidth={1.75} />
                Read the docs
                <ArrowUpRight
                  className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2}
                />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}