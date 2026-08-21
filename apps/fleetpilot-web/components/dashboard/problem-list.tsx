'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, Trash2, Play } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Problem {
  id: string;
  name: string;
  nodeCount: number;
  customerCount: number;
  vehicleCount: number;
  createdAt: string;
}

export function ProblemList({
  problems,
  onDelete,
}: {
  problems: Problem[];
  onDelete?: (id: string) => void;
}): React.ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="text-center">Nodes</TableHead>
          <TableHead className="text-center">Customers</TableHead>
          <TableHead className="text-center">Vehicles</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {problems.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              No problems yet. Build one to get started.
            </TableCell>
          </TableRow>
        )}
        {problems.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <Link href={`/dashboard/${p.id}`} className="font-medium hover:underline">
                {p.name}
              </Link>
            </TableCell>
            <TableCell className="text-center">{p.nodeCount}</TableCell>
            <TableCell className="text-center">{p.customerCount}</TableCell>
            <TableCell className="text-center">{p.vehicleCount}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(p.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/${p.id}`}>
                      <Play className="mr-2 h-4 w-4" /> Solve
                    </Link>
                  </DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(p.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
