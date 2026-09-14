import * as React from 'react';
import Link from 'next/link';
import { Github, Package, ShieldCheck } from 'lucide-react';

type FooterLink = { label: string; href: string; external?: boolean };

const SECTIONS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Algorithms', href: '#algorithms' },
      { label: 'Workflow', href: '#workflow' },
      { label: 'Benchmarks', href: '#benchmarks' },
      { label: 'API', href: '#api' },
    ],
  },
  {
    title: 'Resources',
    links: [
      {
        label: 'GitHub repository',
        href: 'https://github.com/sachncs/fleetpilot',
        external: true,
      },
      {
        label: 'npm package',
        href: 'https://www.npmjs.com/package/fleetpilot',
        external: true,
      },
      {
        label: 'API documentation',
        href: 'https://github.com/sachncs/fleetpilot#api',
        external: true,
      },
      {
        label: 'Paper · arXiv:2602.23685',
        href: 'https://arxiv.org/abs/2602.23685',
        external: true,
      },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'Roadmap', href: 'https://github.com/sachncs/fleetpilot#roadmap', external: true },
      { label: 'Changelog', href: 'https://github.com/sachncs/fleetpilot/blob/master/CHANGELOG.md', external: true },
      { label: 'Contributing', href: 'https://github.com/sachncs/fleetpilot/blob/master/CONTRIBUTING.md', external: true },
      { label: 'Security', href: 'https://github.com/sachncs/fleetpilot/blob/master/SECURITY.md', external: true },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Issues', href: 'https://github.com/sachncs/fleetpilot/issues', external: true },
      { label: 'Discussions', href: 'https://github.com/sachncs/fleetpilot/discussions', external: true },
      { label: 'Code of Conduct', href: 'https://github.com/sachncs/fleetpilot/blob/master/CODE_OF_CONDUCT.md', external: true },
      { label: 'Support', href: 'https://github.com/sachncs/fleetpilot/blob/master/SUPPORT.md', external: true },
    ],
  },
];

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_70%,transparent)]">
      <div className="container-wide py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr] lg:gap-16">
          <div>
            <Link
              href="/"
              aria-label="FleetPilot home"
              className="flex items-center gap-2.5"
            >
              <Logomark className="size-7" />
              <span className="display text-[16px] font-medium tracking-tight">
                FleetPilot
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-[13px] leading-[1.6] text-[var(--fg-soft)]">
              Two-stage metaheuristic for resource-constrained
              pickup-and-delivery. Open source under the ISC license.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Pill icon={Github} label="sachncs/fleetpilot" href="https://github.com/sachncs/fleetpilot" />
              <Pill icon={Package} label="v2.0.0 on npm" href="https://www.npmjs.com/package/fleetpilot" />
              <Pill icon={ShieldCheck} label="ISC license" href="https://github.com/sachncs/fleetpilot/blob/master/LICENSE" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h4 className="mono mb-3 text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
                  {section.title}
                </h4>
                <ul className="flex flex-col gap-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noreferrer noopener' : undefined}
                        className="text-[13px] text-[var(--fg-soft)] transition-colors hover:text-[var(--fg)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-[var(--line)] pt-6 text-[12px] text-[var(--fg-muted)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span>© 2026 Sachin · FleetPilot</span>
            <span className="text-[var(--fg-faint)]">·</span>
            <span>ISC License</span>
            <span className="text-[var(--fg-faint)]">·</span>
            <span>Built in India</span>
          </div>
          <div className="flex items-center gap-2 mono text-[var(--fg-muted)]">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            status: operational
          </div>
        </div>
      </div>
    </footer>
  );
}

function Pill({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  href: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="chip hover:text-[var(--fg)]"
    >
      <Icon className="size-3" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

function Logomark({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lm-grad-f" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        fill="url(#lm-grad-f)"
      />
      <path
        d="M12 27V13h8.4c3 0 5 1.6 5 4.4 0 2-1.1 3.4-3 4 2.4.5 3.7 2 3.7 4.3 0 3-2 4.8-5.5 4.8H12Zm3-8.3h4.6c1.5 0 2.5-.7 2.5-2s-1-2-2.5-2H15v4Zm0 6.4h5c1.6 0 2.6-.8 2.6-2.2s-1-2.2-2.6-2.2h-5v4.4Z"
        fill="var(--bg)"
      />
    </svg>
  );
}