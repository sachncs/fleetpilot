'use client';

import * as React from 'react';
import { ProblemList } from '@/components/dashboard/problem-list';
import { JobList } from '@/components/dashboard/job-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface Problem {
  id: string;
  name: string;
  nodeCount: number;
  customerCount: number;
  vehicleCount: number;
  createdAt: string;
}

interface Job {
  id: string;
  problemId: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

export default function DashboardPage(): React.ReactElement {
  const [problems, setProblems] = React.useState<Problem[]>([]);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [apiKey, setApiKey] = React.useState('');

  React.useEffect(() => {
    setApiKey(localStorage.getItem('fleetpilot_api_key') ?? '');
  }, []);

  React.useEffect(() => {
    if (!apiKey) {
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${apiKey}` };

    Promise.all([
      fetch('/api/problems?limit=20', { headers }).then((r) => r.json() as Promise<{ problems: Problem[] }>),
      fetch('/api/jobs?limit=20', { headers }).then((r) => r.json() as Promise<{ jobs: Job[] }>),
    ]).then(([probData, jobData]) => {
      setProblems(probData.problems);
      setJobs(jobData.jobs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apiKey]);

  const deleteProblem = async (id: string): Promise<void> => {
    await fetch(`/api/problems/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    setProblems((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button asChild>
            <Link href="/build">
              <Plus className="mr-1 h-4 w-4" /> New scenario
            </Link>
          </Button>
        </div>

        {!apiKey && (
          <Card className="mb-6">
            <CardContent className="py-6 text-center text-muted-foreground">
              Set your API key in <Link href="/settings" className="underline">Settings</Link> to get started.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <ProblemList problems={problems} onDelete={deleteProblem} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent runs</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <JobList jobs={jobs} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
