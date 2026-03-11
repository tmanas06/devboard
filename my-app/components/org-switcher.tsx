'use client';

import { useOrg } from '@/contexts/org-context';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { CreateOrgDialog } from './create-org-dialog';

export function OrgSwitcher() {
    const { selectedOrg, userOrgs, switchOrg, isLoading } = useOrg();
    const [open, setOpen] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    if (isLoading || userOrgs.length === 0) {
        return null;
    }

    // Don't show switcher if user only belongs to one org
    if (userOrgs.length === 1) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-sidebar px-3 py-2 text-foreground font-mono tracking-wider glow-secondary">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm truncate">{selectedOrg?.name}</span>
            </div>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground font-mono tracking-wider glow-secondary"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="h-4 w-4 text-sidebar-primary shrink-0" />
                        <span className="truncate text-sm">{selectedOrg?.name ?? 'Select organization'}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-1 border-border bg-popover" align="start">
                <div className="space-y-0.5">
                    {userOrgs.map((org) => {
                        const isActive = org.id === selectedOrg?.id;
                        return (
                            <button
                                key={org.id}
                                onClick={() => {
                                    switchOrg(org.id);
                                    setOpen(false);
                                }}
                                className={cn(
                                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-mono tracking-widest transition-colors',
                                    isActive
                                        ? 'bg-primary/20 text-primary border border-primary'
                                        : 'text-foreground hover:bg-foreground/10',
                                )}
                            >
                                <Building2 className="h-4 w-4 shrink-0" />
                                <span className="flex-1 truncate text-left">{org.name}</span>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        'text-[10px] px-1.5 py-0 border',
                                        org.role === 'ORG_ADMIN' && 'border-chart-3 text-chart-3 bg-transparent',
                                        org.role === 'MEMBER' && 'border-chart-2 text-chart-2 bg-transparent',
                                        org.role === 'ADMIN' && 'border-chart-1 text-chart-1 bg-transparent',
                                    )}
                                >
                                    {org.role === 'ORG_ADMIN' ? 'Admin' : org.role === 'ADMIN' ? 'Super' : 'Member'}
                                </Badge>
                                {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-2 border-t border-border/20 pt-2">
                    <button
                        onClick={() => {
                            setOpen(false);
                            setShowCreateDialog(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground font-mono transition-colors hover:bg-foreground/10"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Initialize Node</span>
                    </button>
                </div>
            </PopoverContent>
            <CreateOrgDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
        </Popover>
    );
}
