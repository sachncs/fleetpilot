'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { LoadSample } from '@/components/problem/load-sample';
import { CustomerForm } from '@/components/problem/customer-form';
import { VehicleForm } from '@/components/problem/vehicle-form';
import { ProblemJson } from '@/components/problem/problem-json';
import { SolveButton } from '@/components/solver/solve-button';

const BuildMap = dynamic(
  () => import('@/components/map/build-map').then((m) => m.BuildMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-xl border bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export default function BuildPage(): React.ReactElement {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Home
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Build problem</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/simulate">Open simulator →</Link>
        </Button>
      </header>
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_420px]">
        <div className="relative min-h-[400px]">
          <BuildMap referenceOrigin={null} />
        </div>
        <div className="overflow-y-auto pr-1">
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="setup" className="space-y-4">
              <LoadSample />
              <SolveButton />
            </TabsContent>
            <TabsContent value="entities" className="space-y-4">
              <CustomerForm />
              <VehicleForm />
            </TabsContent>
            <TabsContent value="json">
              <ProblemJson />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
