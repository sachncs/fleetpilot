import * as React from 'react';
import { Star, GitFork, ShieldCheck, Cpu, ScrollText, Package } from 'lucide-react';

const ITEMS = [
  {
    icon: Package,
    label: 'npm',
    value: 'fleetpilot',
    href: 'https://www.npmjs.com/package/fleetpilot',
  },
  {
    icon: Star,
    label: 'GitHub',
    value: 'sachncs/fleetpilot',
    href: 'https://github.com/sachncs/fleetpilot',
  },
  {
    icon: ShieldCheck,
    label: 'License',
    value: 'ISC',
    href: 'https://github.com/sachncs/fleetpilot/blob/master/LICENSE',
  },
  {
    icon: Cpu,
    label: 'Runtime',
    value: 'Node ≥ 26 · Browser',
    href: 'https://github.com/sachncs/fleetpilot',
  },
  {
    icon: ScrollText,
    label: 'Cite',
    value: 'arXiv:2602.23685',
    href: 'https://arxiv.org/abs/2602.23685',
  },
  {
    icon: GitFork,
    label: 'Tests',
    value: '350+ · coverage 85%',
    href: 'https://github.com/sachncs/fleetpilot',
  },
];

export function TrustBar(): React.ReactElement {
  return (
    <section className="border-y border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] py-6 backdrop-blur-md">
      <div className="container-wide">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-10">
          {ITEMS.map(({ icon: Icon, label, value, href }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex items-center gap-2 text-[12px] text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                <span className="font-medium uppercase tracking-[0.12em] text-[var(--fg-faint)]">
                  {label}
                </span>
                <span className="mono text-[var(--fg-soft)] group-hover:text-[var(--fg)]">
                  {value}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}