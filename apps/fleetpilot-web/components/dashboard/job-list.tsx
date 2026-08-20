'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Job {
  id: string;
  problemId: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export function JobList({ jobs }: { jobs: Job[] }): React.ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Job ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Error</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              No jobs yet.
            </TableCell>
          </TableRow>
        )}
        {jobs.map((j) => {
          const duration =
            j.startedAt && j.completedAt
              ? ((new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime()) / 1000).toFixed(1) + 's'
              : j.startedAt
                ? 'running...'
                : '—';
          return (
            <TableRow key={j.id}>
              <TableCell className="font-mono text-xs">{j.id.slice(0, 16)}...</TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_STYLES[j.status] ?? ''}>
                  {j.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(j.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>{duration}</TableCell>
              <TableCell className="max-w-48 truncate text-destructive text-xs">
                {j.error ?? ''}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
