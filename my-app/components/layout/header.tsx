'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrg } from '@/contexts/org-context';
import { ModeToggle } from '@/components/mode-toggle';

export function Header() {
  const { selectedOrg, userRole } = useOrg();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6 shadow-glow" style={{ boxShadow: '0 0 15px var(--shadow-glow)' }}>
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-primary">Welcome User!</h2>
          <p className="text-sm text-foreground/80 font-mono">Status: Connected</p>
        </div>
        {selectedOrg && (
          <div className="ml-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-foreground/70" />
            <span className="text-sm font-mono text-foreground/70">{selectedOrg.name}</span>
            {userRole && (
              <Badge variant="secondary" className="text-[10px]">
                {userRole === 'ORG_ADMIN' ? 'Admin' : userRole === 'ADMIN' ? 'Super Admin' : 'Member'}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <ModeToggle />
        <UserButton />
      </div>
    </header>
  );
}
