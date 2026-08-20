'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ApiKeyManager } from '@/components/settings/api-key-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SettingsPage(): React.ReactElement {
  const [apiKey, setApiKey] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem('fleetpilot_api_key') ?? '';
    setApiKey(stored);
    setSaved(!!stored);
  }, []);

  const saveKey = (): void => {
    localStorage.setItem('fleetpilot_api_key', apiKey);
    setSaved(true);
    toast.success('API key saved');
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <h1 className="mb-6 text-2xl font-bold">Settings</h1>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter your FleetPilot API key to connect to the backend.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="fp_..."
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
                  className="font-mono"
                />
                <Button onClick={saveKey} disabled={!apiKey}>
                  {saved ? 'Saved' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {apiKey && <ApiKeyManager apiKey={apiKey} />}
        </div>
      </main>
    </div>
  );
}
