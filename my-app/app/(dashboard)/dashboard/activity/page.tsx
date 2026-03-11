'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    Download,
    Filter,
    ChevronLeft,
    ChevronRight,
    Plus,
    Pencil,
    ArrowRight,
    UserPlus,
    Trash2,
    Clock,
    MessageSquare,
    RefreshCw,
    AlertCircle,
    Inbox,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrg } from '@/contexts/org-context';
import { CardGridSkeleton } from '@/components/skeletons';
import type { ActivityFeedResponse, ActivityAction } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const actionLabels: Record<string, string> = {
    TASK_CREATED: 'created a task',
    TASK_UPDATED: 'updated a task',
    TASK_STATUS_CHANGED: 'changed task status',
    TASK_ASSIGNED: 'assigned a task',
    TASK_DELETED: 'deleted a task',
    TASK_BULK_DELETED: 'bulk deleted tasks',
    TASK_BULK_STATUS_CHANGED: 'bulk updated task statuses',
    TASK_BULK_ASSIGNED: 'bulk assigned tasks',
    TIME_ENTRY_CREATED: 'logged time',
    TIME_ENTRY_DELETED: 'deleted a time entry',
    TIME_ENTRY_BULK_DELETED: 'bulk deleted time entries',
    COMMENT_ADDED: 'added a comment',
    COMMENT_DELETED: 'deleted a comment',
};

const actionIcons: Record<string, React.ReactNode> = {
    TASK_CREATED: <Plus className="h-4 w-4" />,
    TASK_UPDATED: <Pencil className="h-4 w-4" />,
    TASK_STATUS_CHANGED: <ArrowRight className="h-4 w-4" />,
    TASK_ASSIGNED: <UserPlus className="h-4 w-4" />,
    TASK_DELETED: <Trash2 className="h-4 w-4" />,
    TASK_BULK_DELETED: <Trash2 className="h-4 w-4" />,
    TASK_BULK_STATUS_CHANGED: <ArrowRight className="h-4 w-4" />,
    TASK_BULK_ASSIGNED: <UserPlus className="h-4 w-4" />,
    TIME_ENTRY_CREATED: <Clock className="h-4 w-4" />,
    TIME_ENTRY_DELETED: <Trash2 className="h-4 w-4" />,
    TIME_ENTRY_BULK_DELETED: <Trash2 className="h-4 w-4" />,
    COMMENT_ADDED: <MessageSquare className="h-4 w-4" />,
    COMMENT_DELETED: <Trash2 className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
    TASK_CREATED: 'bg-green-100 text-green-700',
    TASK_UPDATED: 'bg-blue-100 text-blue-700',
    TASK_STATUS_CHANGED: 'bg-purple-100 text-purple-700',
    TASK_ASSIGNED: 'bg-indigo-100 text-indigo-700',
    TASK_DELETED: 'bg-red-100 text-red-700',
    TASK_BULK_DELETED: 'bg-red-100 text-red-700',
    TASK_BULK_STATUS_CHANGED: 'bg-purple-100 text-purple-700',
    TASK_BULK_ASSIGNED: 'bg-indigo-100 text-indigo-700',
    TIME_ENTRY_CREATED: 'bg-teal-100 text-teal-700',
    TIME_ENTRY_DELETED: 'bg-red-100 text-red-700',
    TIME_ENTRY_BULK_DELETED: 'bg-red-100 text-red-700',
    COMMENT_ADDED: 'bg-amber-100 text-amber-700',
    COMMENT_DELETED: 'bg-red-100 text-red-700',
};

function getMetadataDescription(action: string, metadata?: Record<string, any>): string | null {
    if (!metadata) return null;

    switch (action) {
        case 'TASK_CREATED':
            return `"${metadata.title}" — ${metadata.priority || ''} priority`;
        case 'TASK_STATUS_CHANGED':
            return `"${metadata.title}" from ${metadata.oldStatus?.replace('_', ' ')} → ${metadata.newStatus?.replace('_', ' ')}`;
        case 'TASK_UPDATED':
            return metadata.title ? `"${metadata.title}"` : null;
        case 'TASK_ASSIGNED':
            return `"${metadata.title}" to ${metadata.assignedToIds?.length || 0} user(s)`;
        case 'TASK_DELETED':
            return `"${metadata.title}"`;
        case 'TASK_BULK_DELETED':
        case 'TASK_BULK_STATUS_CHANGED':
        case 'TASK_BULK_ASSIGNED':
            return `${metadata.count} task(s)${metadata.newStatus ? ` → ${metadata.newStatus.replace('_', ' ')}` : ''}`;
        case 'TIME_ENTRY_CREATED':
            return `${metadata.hours}h${metadata.description ? ` — ${metadata.description}` : ''}`;
        case 'TIME_ENTRY_DELETED':
            return `${metadata.hours}h entry`;
        case 'TIME_ENTRY_BULK_DELETED':
            return `${metadata.count} entries`;
        case 'COMMENT_ADDED':
            return `on "${metadata.taskTitle}"${metadata.bodyPreview ? `: "${metadata.bodyPreview}"` : ''}`;
        case 'COMMENT_DELETED':
            return `from "${metadata.taskTitle}"`;
        default:
            return null;
    }
}

export default function ActivityPage() {
    const { getToken } = useAuth();
    const { toast } = useToast();
    const { selectedOrgId, isLoading: orgLoading } = useOrg();
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState<string>('ALL');
    const [entityFilter, setEntityFilter] = useState<string>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { data, isLoading, isError, refetch } = useQuery<ActivityFeedResponse>({
        queryKey: ['activity', selectedOrgId, page, actionFilter, entityFilter, startDate, endDate],
        queryFn: async () => {
            const token = await getToken();
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '20');
            if (actionFilter !== 'ALL') params.set('action', actionFilter);
            if (entityFilter !== 'ALL') params.set('entityType', entityFilter);
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            const { data } = await api.get(`/activity?${params}`, {
                headers: { Authorization: token ? `Bearer ${token}` : undefined },
            });
            return data;
        },
        enabled: !!selectedOrgId,
        refetchInterval: 5000,
    });

    const handleExport = async () => {
        try {
            const token = await getToken();
            const params = new URLSearchParams();
            if (actionFilter !== 'ALL') params.set('action', actionFilter);
            if (entityFilter !== 'ALL') params.set('entityType', entityFilter);
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            const response = await api.get(`/activity/export?${params}`, {
                headers: { Authorization: token ? `Bearer ${token}` : undefined },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `activity-log-${Date.now()}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast({ title: 'Export complete', description: 'Activity log downloaded as CSV.' });
        } catch {
            toast({ variant: 'destructive', title: 'Export failed', description: 'Please try again.' });
        }
    };

    const items = data?.items || [];
    const totalPages = data?.totalPages || 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold uppercase tracking-widest text-neon-pink">Activity</h1>
                        <span className="flex items-center gap-1.5 rounded-full bg-neon-green/10 px-2.5 py-1 text-xs font-medium text-neon-green border border-neon-green/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
                            </span>
                            Live
                        </span>
                    </div>
                    <p className="text-muted-foreground font-mono tracking-widest mt-1 text-sm">// SYSTEM_TRACKER_V4.0</p>
                </div>
                <Button variant="outline" onClick={handleExport} className="gap-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/20">
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card className="bg-card border-border">
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Entity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Entities</SelectItem>
                                <SelectItem value="TASK">Tasks</SelectItem>
                                <SelectItem value="TIME_ENTRY">Time Entries</SelectItem>
                                <SelectItem value="COMMENT">Comments</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Actions</SelectItem>
                                <SelectItem value="TASK_CREATED">Task Created</SelectItem>
                                <SelectItem value="TASK_UPDATED">Task Updated</SelectItem>
                                <SelectItem value="TASK_STATUS_CHANGED">Status Changed</SelectItem>
                                <SelectItem value="TASK_ASSIGNED">Task Assigned</SelectItem>
                                <SelectItem value="TASK_DELETED">Task Deleted</SelectItem>
                                <SelectItem value="TIME_ENTRY_CREATED">Time Logged</SelectItem>
                                <SelectItem value="TIME_ENTRY_DELETED">Time Deleted</SelectItem>
                                <SelectItem value="COMMENT_ADDED">Comment Added</SelectItem>
                                <SelectItem value="COMMENT_DELETED">Comment Deleted</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="w-[160px]"
                            placeholder="From"
                        />
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className="w-[160px]"
                            placeholder="To"
                        />
                        {(actionFilter !== 'ALL' || entityFilter !== 'ALL' || startDate || endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setActionFilter('ALL'); setEntityFilter('ALL'); setStartDate(''); setEndDate(''); setPage(1); }}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Activity Feed */}
            {isLoading || orgLoading ? (
                <CardGridSkeleton count={6} />
            ) : isError ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                        <AlertCircle className="h-10 w-10 text-destructive" />
                        <p className="text-muted-foreground font-mono">Failed to load activity feed.</p>
                        <Button variant="outline" onClick={() => refetch()} className="gap-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/20">
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            ) : items.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                        <Inbox className="h-10 w-10 text-muted" />
                        <p className="text-muted-foreground font-mono">No activity found. Actions will appear here as they happen.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-1">
                    {items.map((item, index) => {
                        const userName = item.user
                            ? [item.user.firstName, item.user.lastName].filter(Boolean).join(' ') || item.user.email
                            : 'Unknown';
                        const description = getMetadataDescription(item.action, item.metadata);

                        return (
                            <div key={item.id} className="flex gap-4 py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center">
                                    <div className={`flex items-center justify-center h-8 w-8 rounded-full border border-border bg-card ${actionColors[item.action] || 'bg-muted text-muted-foreground'}`}>
                                        {actionIcons[item.action] || <Activity className="h-4 w-4" />}
                                    </div>
                                    {index < items.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pb-2">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-foreground">{userName}</span>
                                        <span className="text-sm text-muted-foreground">{actionLabels[item.action] || item.action}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {item.entityType}
                                        </Badge>
                                    </div>
                                    {description && (
                                        <p className="text-sm text-muted-foreground/80 mt-0.5 truncate font-mono">{description}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground/60 mt-1 font-mono uppercase tracking-tighter">{formatDateTime(item.createdAt)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground font-mono">
                        Page {page} of {totalPages} ({data?.total || 0} total)
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
