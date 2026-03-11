'use client';

import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, UserPlus, X, CheckSquare } from 'lucide-react';

interface BulkAction {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline';
}

interface BulkActionToolbarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    actions: BulkAction[];
}

export function BulkActionToolbar({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    actions,
}: BulkActionToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border bg-white/95 backdrop-blur px-4 py-3 shadow-md">
            <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                    {selectedCount} of {totalCount} selected
                </span>
            </div>

            <div className="h-4 w-px bg-gray-300" />

            {selectedCount < totalCount ? (
                <Button variant="ghost" size="sm" onClick={onSelectAll} className="text-xs">
                    Select All
                </Button>
            ) : (
                <Button variant="ghost" size="sm" onClick={onDeselectAll} className="text-xs">
                    Deselect All
                </Button>
            )}

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
                {actions.map((action, i) => (
                    <Button
                        key={i}
                        variant={action.variant || 'outline'}
                        size="sm"
                        onClick={action.onClick}
                        className="gap-1.5"
                    >
                        {action.icon}
                        {action.label}
                    </Button>
                ))}
            </div>

            <div className="ml-auto">
                <Button variant="ghost" size="sm" onClick={onDeselectAll}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export { Trash2, RefreshCw, UserPlus };
