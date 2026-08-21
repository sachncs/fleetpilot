'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { useIsMobile } from '@/hooks/use-mobile';
import { useShortcut } from '@/hooks/use-shortcut';
import { NAV_GROUPS } from '@/lib/nav';

/** Global ⌘K route palette with header trigger. Suppressed on mobile viewports (<768px). */
export function CommandPalette(): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();

  useShortcut(() => setOpen(true), { key: 'k', enabled: !isMobile });

  const run = (href: string): void => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      {!isMobile && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          Search…
          <Kbd>⌘K</Kbd>
        </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {NAV_GROUPS.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((item) => (
                <CommandItem key={item.href} onSelect={() => run(item.href)}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
