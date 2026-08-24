'use client';

import * as React from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface GeocodeHit {
  displayName: string;
  lat: number;
  lng: number;
}

export interface PlaceSearchBarProps {
  onPick: (hit: GeocodeHit) => void;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

/** Address search backed by the server-side /api/geocode proxy. */
export function PlaceSearchBar({ onPick }: PlaceSearchBarProps): React.ReactElement {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<GeocodeHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const seqRef = React.useRef(0);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResults([]);
      setOpen(false);
      setError(null);
      return;
    }

    const seq = ++seqRef.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const apiKey = localStorage.getItem('fleetpilot_api_key') ?? '';
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const data = (await res.json()) as { results: GeocodeHit[] };
        if (seq !== seqRef.current) return; // stale response
        setResults(data.results);
        setOpen(true);
        if (data.results.length === 0) setError('No matches found');
      } catch (err) {
        if (seq !== seqRef.current) return;
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        if (seq === seqRef.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const pick = (hit: GeocodeHit): void => {
    onPick(hit);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-72 max-w-full">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a place or address…"
            className="bg-background pl-8 pr-8"
            aria-label="Search a place or address"
          />
          {searching && (
            <Loader2 className="text-muted-foreground absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        {error ? (
          <p className="text-muted-foreground px-3 py-2 text-xs">{error}</p>
        ) : (
          results.map((hit) => (
            <Button
              key={`${hit.lat},${hit.lng}`}
              variant="ghost"
              className="h-auto w-full justify-start gap-2 px-2 py-2 text-left"
              onClick={() => pick(hit)}
            >
              <MapPin className="text-muted-foreground size-4 shrink-0" />
              <span className="line-clamp-2 text-xs font-normal">{hit.displayName}</span>
            </Button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
