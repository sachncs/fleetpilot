'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDuration, formatDistance } from '@/lib/utils';
import { Play } from 'lucide-react';

interface SolutionCardProps {
  id: string;
  makespan: number;
  totalDistance: number;
  feasible: boolean;
  createdAt: string;
}

export function SolutionCard({
  id,
  makespan,
  totalDistance,
  feasible,
  createdAt,
}: SolutionCardProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono">{id.slice(0, 16)}...</CardTitle>
          <Badge variant={feasible ? 'default' : 'destructive'}>
            {feasible ? 'Feasible' : 'Infeasible'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Makespan</div>
            <div className="font-semibold">{formatDuration(makespan)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Distance</div>
            <div className="font-semibold">{formatDistance(totalDistance / 100)}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleString()}
        </div>
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href={`/simulate?solution=${id}`}>
            <Play className="mr-1 h-3 w-3" /> Simulate
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
