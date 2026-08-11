import Link from 'next/link';
import { Building2, MapPin, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage(): React.ReactElement {
  return (
    <main className="container mx-auto max-w-5xl py-16">
      <header className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">VRP-RPD Solver</h1>
        <p className="text-lg text-muted-foreground">
          Interactively build and solve vehicle routing problems with resource-constrained pickup
          and delivery on a real map.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Build a problem</CardTitle>
            </div>
            <CardDescription>
              Drop a depot and customer stops on the map, configure vehicles and time windows,
              then solve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/build">
                <MapPin className="mr-2 h-4 w-4" />
                Open builder
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
              Step through a solved route plan over time. Watch vehicles move, see ETAs, and
              compare against KPIs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/simulate">
                <Play className="mr-2 h-4 w-4" />
                Open simulator
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>
          Built with Next.js, shadcn/ui, and{' '}
          <a href="https://shadcn-map.vercel.app" className="underline" target="_blank" rel="noreferrer">
            shadcn-map
          </a>
          . Powered by the <code>vehicle-routing</code> package.
        </p>
      </footer>
    </main>
  );
}
