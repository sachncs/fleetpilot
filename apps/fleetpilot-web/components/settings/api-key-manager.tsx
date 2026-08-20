'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export function ApiKeyManager({ apiKey }: { apiKey: string }): React.ReactElement {
  const [keys, setKeys] = React.useState<ApiKey[]>([]);
  const [newName, setNewName] = React.useState('');
  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const fetchKeys = React.useCallback(async () => {
    const res = await fetch('/api/keys', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { keys: ApiKey[] };
      setKeys(data.keys);
    }
  }, [apiKey]);

  React.useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const generate = async (): Promise<void> => {
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      const data = (await res.json()) as { key: string; name: string };
      setGeneratedKey(data.key);
      setNewName('');
      void fetchKeys();
    }
  };

  const revoke = async (id: string): Promise<void> => {
    const res = await fetch(`/api/keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      toast.success('API key revoked');
      void fetchKeys();
    }
  };

  const copyKey = async (key: string): Promise<void> => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>API Keys</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" /> Generate Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate API Key</DialogTitle>
              </DialogHeader>
              {generatedKey ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Copy this key now. It won&apos;t be shown again.
                  </p>
                  <div className="flex gap-2">
                    <Input readOnly value={generatedKey} className="font-mono text-xs" />
                    <Button size="sm" onClick={() => void copyKey(generatedKey)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => { setGeneratedKey(null); setOpen(false); }}>
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Key name (e.g. production)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Button className="w-full" onClick={() => void generate()} disabled={!newName}>
                    Generate
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(k.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => void revoke(k.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
