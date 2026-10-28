'use client';

import * as React from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DELIVERY_CSV_TEMPLATE, parseDeliveryCsv, type DeliveryImportRow } from '@/lib/delivery-csv';

const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(DELIVERY_CSV_TEMPLATE)}`;

export function DeliveryImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => Promise<void>;
}): React.ReactElement {
  const [rows, setRows] = React.useState<DeliveryImportRow[]>([]);
  const [fileName, setFileName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) return;
    setRows([]);
    setFileName('');
    setError(null);
    setBusy(false);
  }, [open]);

  const chooseFile = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);
    if (file.size > 2 * 1024 * 1024) {
      setRows([]);
      setError('The CSV must be smaller than 2 MB.');
      return;
    }
    try {
      setRows(parseDeliveryCsv(await file.text()));
    } catch (parseError) {
      setRows([]);
      setError(parseError instanceof Error ? parseError.message : 'Could not read the CSV.');
    }
  };

  const importRows = async (): Promise<void> => {
    if (rows.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/orders/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? 'fp_public_console'}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ orders: rows }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Import failed (${response.status})`);
      await onImported();
      onOpenChange(false);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import delivery manifest</DialogTitle>
          <DialogDescription>
            Upload up to 500 stops. FleetPilot validates the whole manifest before adding any delivery.
          </DialogDescription>
        </DialogHeader>

        <div className="matte-glass rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-foreground text-background"><FileSpreadsheet className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{fileName || 'Choose a CSV manifest'}</p>
              <p className="text-muted-foreground text-xs">Required: ref, latitude, longitude. Quantity and windows are optional.</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href={templateHref} download="fleetpilot-deliveries-template.csv">Download template</a>
            </Button>
          </div>
          <Input className="mt-4 cursor-pointer" type="file" accept=".csv,text/csv" onChange={(event) => void chooseFile(event)} />
        </div>

        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Ready to import</span>
              <span className="text-muted-foreground">{rows.length} deliver{rows.length === 1 ? 'y' : 'ies'}</span>
            </div>
            <div className="max-h-64 overflow-auto rounded-xl border">
              <Table>
                <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Location</TableHead><TableHead>Window</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.slice(0, 8).map((row) => (
                    <TableRow key={row.ref}>
                      <TableCell className="font-medium">{row.ref}</TableCell>
                      <TableCell className="text-muted-foreground">{row.lat.toFixed(4)}, {row.lng.toFixed(4)}</TableCell>
                      <TableCell>{row.windowStart || row.windowEnd ? `${row.windowStart ?? '—'}–${row.windowEnd ?? '—'}` : 'Any time'}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 8 && <p className="border-t px-3 py-2 text-center text-xs text-muted-foreground">and {rows.length - 8} more</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={() => void importRows()} disabled={busy || rows.length === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <Upload />}
            Import {rows.length > 0 ? rows.length : ''} deliveries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
