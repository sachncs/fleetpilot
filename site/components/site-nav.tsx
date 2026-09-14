'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Moon, Sun, X, ArrowUpRight } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#algorithms', label: 'Algorithms' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#benchmarks', label: 'Benchmarks' },
  { href: '#api', label: 'API' },
] as const;

export function SiteNav(): React.ReactElement {
  const { theme, toggle, mounted } = useTheme();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled
          ? 'border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="container-wide flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="FleetPilot home"
          className="group flex items-center gap-2.5"
        >
          <Logomark className="size-7" />
          <span className="display text-[15px] font-medium tracking-tight">
            FleetPilot
          </span>
          <span className="mono ml-1 hidden text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)] sm:inline">
            v2.0
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--fg-soft)] transition-colors hover:bg-[color-mix(in_oklab,var(--fg)_5%,transparent)] hover:text-[var(--fg)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="grid size-9 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--fg-soft)] transition-colors hover:text-[var(--fg)]"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="size-4" strokeWidth={1.75} />
            ) : (
              <Moon className="size-4" strokeWidth={1.75} />
            )}
          </button>
          <Link
            href="https://github.com/sachncs/fleetpilot"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--bg-elev)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--fg-soft)] transition-colors hover:text-[var(--fg)] sm:inline-flex"
          >
            GitHub
            <ArrowUpRight className="size-3.5" strokeWidth={2} />
          </Link>
          <Link
            href="https://www.npmjs.com/package/fleetpilot"
            target="_blank"
            rel="noreferrer noopener"
            className="btn-primary hidden sm:inline-flex"
          >
            npm i fleetpilot
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--bg-elev)] md:hidden"
          >
            {open ? (
              <X className="size-4" strokeWidth={1.75} />
            ) : (
              <Menu className="size-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      <div
        className={cn(
          'md:hidden',
          'overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
          open ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="container-wide flex flex-col gap-1 pb-6 pt-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="display flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] px-4 py-3 text-base font-medium"
            >
              {link.label}
              <ArrowUpRight
                className="size-4 text-[var(--fg-muted)]"
                strokeWidth={1.75}
              />
            </Link>
          ))}
          <Link
            href="https://www.npmjs.com/package/fleetpilot"
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => setOpen(false)}
            className="btn-primary mt-2 justify-center"
          >
            npm i fleetpilot
          </Link>
        </div>
      </div>
    </header>
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
        <linearGradient id="lm-grad" x1="0" y1="0" x2="40" y2="40">
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
        fill="url(#lm-grad)"
      />
      <path
        d="M12 27V13h8.4c3 0 5 1.6 5 4.4 0 2-1.1 3.4-3 4 2.4.5 3.7 2 3.7 4.3 0 3-2 4.8-5.5 4.8H12Zm3-8.3h4.6c1.5 0 2.5-.7 2.5-2s-1-2-2.5-2H15v4Zm0 6.4h5c1.6 0 2.6-.8 2.6-2.2s-1-2.2-2.6-2.2h-5v4.4Z"
        fill="var(--bg)"
      />
    </svg>
  );
}