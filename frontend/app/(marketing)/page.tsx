import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  GitBranch,
  MapPin,
  Package,
  Route,
  Truck,
} from 'lucide-react';

import { BrandMark } from '@/components/brand-mark';

const WORKFLOW = [
  {
    number: '01',
    title: 'Bring the day into focus',
    body: 'Organize depots, vehicles, delivery windows, and order locations in one operating view.',
  },
  {
    number: '02',
    title: 'Build routes around reality',
    body: 'Select today’s orders and available vehicles. FleetPilot respects capacity, service time, and time windows.',
  },
  {
    number: '03',
    title: 'Review before you release',
    body: 'Compare distance, time, cost, and emissions. Replay each route before it reaches a driver.',
  },
] as const;

export default function HomePage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-5 md:px-10">
          <Link href="/" className="flex items-center gap-2.5" aria-label="FleetPilot home">
            <BrandMark className="size-8" />
            <span className="text-sm font-semibold tracking-[-0.02em]">FleetPilot</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-8 text-[13px] text-neutral-600 md:flex" aria-label="Primary navigation">
            <Link href="#product" className="transition-colors hover:text-black">Product</Link>
            <Link href="#workflow" className="transition-colors hover:text-black">How it works</Link>
            <Link href="https://github.com/sachncs/fleetpilot" target="_blank" className="transition-colors hover:text-black">Open source</Link>
          </nav>
          <Link href="/overview" className="ml-5 inline-flex h-9 items-center gap-2 rounded-full bg-black px-4 text-[13px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-800 md:ml-8">
            Open workspace <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <main>
        <section className="border-b border-black/10">
          <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[0.82fr_1.18fr]">
            <div className="flex min-h-[660px] flex-col justify-center border-black/10 px-5 py-20 md:px-10 lg:border-r lg:py-24">
              <p className="mb-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                <span className="size-1.5 bg-black" /> Fleet operations, made visible
              </p>
              <h1 className="max-w-[680px] text-[clamp(3.5rem,7vw,7.5rem)] font-medium leading-[0.84] tracking-[-0.075em]">
                Know where every vehicle should be next.
              </h1>
              <p className="mt-9 max-w-xl text-base leading-7 text-neutral-600 md:text-lg">
                FleetPilot turns your vehicles and delivery orders into clear, workable routes—so dispatch can organize the day before the day gets away from them.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/orders" className="inline-flex h-12 items-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-800">
                  Plan today’s deliveries <ArrowRight className="size-4" />
                </Link>
                <Link href="/overview" className="inline-flex h-12 items-center gap-2 rounded-full border border-black/15 bg-white/55 px-6 text-sm font-medium backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">
                  See the workspace <ChevronRight className="size-4" />
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-500">
                <span className="flex items-center gap-2"><Check className="size-3.5" /> No account required</span>
                <span className="flex items-center gap-2"><Check className="size-3.5" /> Local-first data</span>
                <span className="flex items-center gap-2"><Check className="size-3.5" /> Open source</span>
              </div>
            </div>
            <ProductFrame />
          </div>
        </section>

        <section id="product" className="border-b border-black/10">
          <div className="mx-auto grid max-w-[1440px] md:grid-cols-3">
            <ValuePoint icon={Truck} title="See the fleet" body="Keep vehicle availability, capacity, costs, and depot assignments in one clean roster." />
            <ValuePoint icon={Package} title="Organize demand" body="Turn scattered delivery requests into a structured queue with locations and service windows." />
            <ValuePoint icon={Route} title="Plan the work" body="Build capacity-aware routes, review the trade-offs, and replay the plan before dispatch." />
          </div>
        </section>

        <section id="workflow" className="border-b border-black/10 px-5 py-24 md:px-10 md:py-32">
          <div className="mx-auto max-w-[1360px]">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">A calmer dispatch workflow</p>
                <h2 className="mt-5 max-w-2xl text-4xl font-medium leading-[1.02] tracking-[-0.05em] md:text-6xl">
                  From delivery list to route plan, without the spreadsheet relay.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-neutral-600 lg:justify-self-end">
                FleetPilot gives operators one place to understand the work, make a plan, and see the operational consequences before vehicles leave the depot.
              </p>
            </div>
            <div className="mt-20 grid border-l border-t border-black/10 md:grid-cols-3">
              {WORKFLOW.map((step) => (
                <article key={step.number} className="min-h-72 border-b border-r border-black/10 p-7 md:p-9">
                  <span className="font-mono text-[11px] text-neutral-400">{step.number}</span>
                  <h3 className="mt-20 text-xl font-medium tracking-[-0.03em]">{step.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-600">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-black px-5 py-24 text-white md:px-10 md:py-32">
          <div className="mx-auto grid max-w-[1360px] gap-16 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Built for an operating day</p>
              <h2 className="mt-6 max-w-4xl text-5xl font-medium leading-[0.95] tracking-[-0.06em] md:text-7xl">
                Less route guesswork.<br />More control over the day.
              </h2>
            </div>
            <div className="space-y-6 border-l border-white/20 pl-7">
              <Proof icon={Clock3} text="Time-window and service-time aware" />
              <Proof icon={Truck} text="Capacity and vehicle-cost aware" />
              <Proof icon={MapPin} text="Visual planning and route playback" />
              <Proof icon={GitBranch} text="Inspectable, deterministic, open source" />
              <Link href="/orders" className="mt-4 inline-flex h-12 items-center gap-2 bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-neutral-200">
                Start with today’s orders <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black text-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-8 text-xs text-neutral-500 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex items-center gap-3"><BrandMark className="size-7 border-white/30 bg-white text-black" /><span className="text-white">FleetPilot</span><span>© 2026</span></div>
          <div className="flex items-center gap-6"><Link href="/overview" className="hover:text-white">Workspace</Link><Link href="https://github.com/sachncs/fleetpilot" target="_blank" className="hover:text-white">GitHub</Link></div>
        </div>
      </footer>
    </div>
  );
}

function ValuePoint({ icon: Icon, title, body }: { icon: typeof Truck; title: string; body: string }): React.ReactElement {
  return (
    <article className="min-h-64 border-b border-black/10 p-7 md:border-b-0 md:border-r md:p-10 last:border-r-0">
      <Icon className="size-5" strokeWidth={1.5} />
      <h2 className="mt-16 text-xl font-medium tracking-[-0.03em]">{title}</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-600">{body}</p>
    </article>
  );
}

function Proof({ icon: Icon, text }: { icon: typeof Truck; text: string }): React.ReactElement {
  return <div className="flex items-center gap-3 text-sm text-neutral-300"><Icon className="size-4 text-white" strokeWidth={1.5} />{text}</div>;
}

function ProductFrame(): React.ReactElement {
  const stops: Array<[number, number]> = [[92, 310], [188, 205], [312, 260], [430, 132], [570, 210], [650, 98]];
  return (
    <div className="relative flex min-h-[660px] items-center overflow-hidden bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,.95),transparent_32%),linear-gradient(145deg,#f7f7f5,#e8e8e4)] p-5 md:p-10 lg:p-12">
      <div className="fluid-float absolute -right-24 -top-20 size-80 rounded-full bg-white/80 blur-3xl" />
      <div className="fluid-float absolute -bottom-32 left-10 size-96 rounded-full bg-black/[0.06] blur-3xl [animation-delay:-4s]" />
      <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/72 shadow-[0_35px_100px_-48px_rgba(0,0,0,.55)] backdrop-blur-2xl">
        <div className="flex h-12 items-center border-b border-black/10 px-4">
          <div className="flex items-center gap-2"><BrandMark className="size-6" /><span className="text-xs font-medium">Tuesday dispatch</span></div>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-neutral-500"><span className="size-1.5 bg-black" /> Plan ready</div>
        </div>
        <div className="grid min-h-[470px] md:grid-cols-[180px_1fr]">
          <aside className="hidden border-r border-black/10 p-3 md:block">
            <p className="px-2 py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-neutral-400">Workspace</p>
            {['Today', 'Deliveries', 'Vehicles', 'Route planner'].map((item, index) => (
              <div key={item} className={`mt-1 flex h-8 items-center gap-2 px-2 text-[10px] ${index === 0 ? 'bg-black text-white' : 'text-neutral-500'}`}><Circle className="size-2.5" fill={index === 0 ? 'currentColor' : 'none'} />{item}</div>
            ))}
          </aside>
          <div className="relative overflow-hidden bg-[#f4f4f2]">
            <svg viewBox="0 0 740 470" className="absolute inset-0 size-full" aria-label="Fleet route planning preview">
              <g stroke="#d4d4d0" strokeWidth="1" fill="none" opacity=".8">
                <path d="M-20 130 C120 70 190 150 330 90 S560 70 780 140" />
                <path d="M20 360 C160 300 220 390 390 320 S580 280 760 340" />
                <path d="M90 -20 C130 130 80 230 170 500" />
                <path d="M520 -30 C450 100 530 250 470 510" />
                <path d="M660 -20 C600 150 700 300 630 500" />
              </g>
              <path d="M92 310 C140 270 135 220 188 205 S255 282 312 260 S360 150 430 132 S510 238 570 210 S620 118 650 98" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" />
              {stops.map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r="11" fill="white" stroke="#111" strokeWidth="2" /><text x={x} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="600">{index + 1}</text></g>)}
            </svg>
            <div className="absolute left-4 top-4 rounded-2xl border border-white/70 bg-white/72 p-4 shadow-[0_18px_45px_-30px_rgba(0,0,0,.5)] backdrop-blur-2xl">
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-400">Today</p>
              <div className="mt-3 grid grid-cols-3 gap-5"><TinyMetric label="Orders" value="48" /><TinyMetric label="Vehicles" value="7" /><TinyMetric label="Distance" value="286 km" /></div>
            </div>
            <div className="absolute bottom-4 right-4 w-48 rounded-2xl border border-white/70 bg-white/72 p-4 shadow-[0_18px_45px_-30px_rgba(0,0,0,.5)] backdrop-blur-2xl">
              <div className="flex items-center justify-between"><span className="text-[10px] font-medium">Route 04</span><span className="font-mono text-[8px] text-neutral-400">READY</span></div>
              <div className="mt-3 h-px bg-neutral-200" />
              <p className="mt-3 text-[9px] leading-4 text-neutral-500">8 stops · 42.6 km<br />Estimated 2h 18m</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TinyMetric({ label, value }: { label: string; value: string }): React.ReactElement {
  return <div><p className="text-[8px] text-neutral-400">{label}</p><p className="mt-1 text-sm font-medium tabular-nums">{value}</p></div>;
}
