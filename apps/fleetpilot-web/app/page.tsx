import Link from 'next/link';
import { Building2, MapPin, Play, Sparkles, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STEPS = [
  {
    n: 1,
    title: 'Drop nodes on the map',
    body: 'Click the map to drop the depot and customer stops. Each marker shows its ID so you can reference it in the next step.',
  },
  {
    n: 2,
    title: 'Add customers + vehicles',
    body: 'For each customer, pick a drop-off and a pickup node, set processing time, and (optionally) time windows. Add vehicles with capacity, cost per km, and a start/end depot.',
  },
  {
    n: 3,
    title: 'Solve and simulate',
    body: 'Press Solve to run ALNS + BRKGA. When the result is feasible, switch to the simulator to play back the routes on the map.',
  },
];

export default function HomePage(): React.ReactElement {
  return (
    <main className="container mx-auto max-w-5xl py-16">
      <header className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">FleetPilot</h1>
        <p className="text-lg text-muted-foreground">
          Solve smarter. Route faster. FleetPilot optimizes vehicle routing with
          resource-constrained pickup and delivery.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">How it works</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.n}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {s.n}
                  </div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                </div>
                <CardDescription className="mt-2">{s.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Build a problem</CardTitle>
            </div>
            <CardDescription>
              Drop a depot and customer stops on the map, configure vehicles and time windows, then
              solve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/build">
                <MapPin className="mr-2 h-4 w-4" />
                Open builder
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              <CardTitle>Simulate a solution</CardTitle>
            </div>
            <CardDescription>
              Step through a solved route plan over time. Watch vehicles move, see ETAs, and compare
              against KPIs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/simulate">
                <Play className="mr-2 h-4 w-4" />
                Open simulator
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="mt-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <CardTitle>Tip: load a sample to see it in action</CardTitle>
            </div>
            <CardDescription>
              Open the builder and click any of the 5 sample problems (Delhi 10, Mumbai 20, etc.) to
              see the full workflow pre-populated.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>
          FleetPilot — Route optimization powered by ALNS + BRKGA metaheuristics.
        </p>
      </footer>
    </main>
  );
}
