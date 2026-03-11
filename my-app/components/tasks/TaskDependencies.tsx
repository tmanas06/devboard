'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Plus,
    X,
    Link as LinkIcon,
    ArrowRight,
    Layers,
    Search,
    Loader2,
    ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Task, TaskStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TaskDependenciesProps {
    taskId: string;
    organizationId: string;
    blockedBy: Task['blockedBy'];
    blocks: Task['blocks'];
}

export function TaskDependencies({ taskId, organizationId, blockedBy = [], blocks = [] }: TaskDependenciesProps) {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Search for potential dependencies
    const { data: searchResults, isLoading: isSearching } = useQuery<Task[]>({
        queryKey: ['tasks-search', organizationId, searchQuery],
        queryFn: async () => {
            const token = await getToken();
            const response = await api.get(`/tasks?organizationId=${organizationId}&search=${searchQuery}`, {
                headers: { Authorization: token ? `Bearer ${token}` : undefined },
            });
            // Filter out current task and existing dependencies
            return (response.data as Task[]).filter(t =>
                t.id !== taskId &&
                !blockedBy.some(b => b.id === t.id) &&
                !blocks.some(b => b.id === t.id)
            );
        },
        enabled: isSearchOpen && searchQuery.length >= 2,
    });

    const addDependencyMutation = useMutation({
        mutationFn: async (dependsOnId: string) => {
            const token = await getToken();
            return api.post(`/tasks/${taskId}/dependencies/${dependsOnId}`, {}, {
                headers: { Authorization: token ? `Bearer ${token}` : undefined },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
            toast({ title: 'Dependency added', description: 'The task relationship has been updated.' });
            setIsSearchOpen(false);
            setSearchQuery('');
        },
    });

    const removeDependencyMutation = useMutation({
        mutationFn: async (dependsOnId: string) => {
            const token = await getToken();
            return api.delete(`/tasks/${taskId}/dependencies/${dependsOnId}`, {
                headers: { Authorization: token ? `Bearer ${token}` : undefined },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
            toast({ title: 'Dependency removed', description: 'The task relationship has been updated.' });
        },
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Task Dependencies</h2>
                </div>

                <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 border-dashed">
                            <Plus className="w-4 h-4" />
                            Add Dependency
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search tasks..."
                                    className="pl-9 h-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {isSearching ? (
                                <div className="p-4 text-center">
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                                </div>
                            ) : searchResults && searchResults.length > 0 ? (
                                <div className="p-1">
                                    {searchResults.map((task) => (
                                        <button
                                            key={task.id}
                                            className="w-full text-left p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors flex flex-col gap-0.5"
                                            onClick={() => addDependencyMutation.mutate(task.id)}
                                            disabled={addDependencyMutation.isPending}
                                        >
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-200 line-clamp-1">{task.title}</span>
                                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{task.status}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : searchQuery.length >= 2 ? (
                                <div className="p-4 text-center text-sm text-gray-500 italic">
                                    No tasks found.
                                </div>
                            ) : (
                                <div className="p-4 text-center text-sm text-gray-500 italic">
                                    Type at least 2 characters to search.
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Visual Graph Area */}
            <div className="relative bg-gray-50/50 dark:bg-gray-900/20 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 overflow-hidden min-h-[400px]">
                <div className="flex flex-col items-center gap-12 relative z-10">

                    {/* Blocked By Section */}
                    <div className="flex flex-wrap justify-center gap-4 w-full">
                        <AnimatePresence>
                            {blockedBy.length > 0 ? (
                                blockedBy.map((task) => (
                                    <DependencyCard
                                        key={task.id}
                                        task={task}
                                        type="blockedBy"
                                        onRemove={() => removeDependencyMutation.mutate(task.id)}
                                    />
                                ))
                            ) : (
                                <div className="text-xs text-gray-400 italic">No incoming dependencies</div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Arrows Down */}
                    {blockedBy.length > 0 && <Connector type="incoming" />}

                    {/* Current Task */}
                    <motion.div
                        layout
                        className="p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 min-w-[240px] text-center"
                    >
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1 block">Current Task</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">This Task</h3>
                    </motion.div>

                    {/* Arrows Down */}
                    {blocks.length > 0 && <Connector type="outgoing" />}

                    {/* Blocks Section */}
                    <div className="flex flex-wrap justify-center gap-4 w-full">
                        <AnimatePresence>
                            {blocks.length > 0 ? (
                                blocks.map((task) => (
                                    <DependencyCard
                                        key={task.id}
                                        task={task}
                                        type="blocks"
                                        onRemove={() => removeDependencyMutation.mutate(task.id)}
                                    />
                                ))
                            ) : (
                                <div className="text-xs text-gray-400 italic">No outgoing dependencies</div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Decorative Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            </div>
        </div>
    );
}

function DependencyCard({ task, type, onRemove }: { task: any, type: 'blockedBy' | 'blocks', onRemove: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: type === 'blockedBy' ? -20 : 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative flex items-center gap-4 p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all min-w-[200px]"
        >
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                type === 'blockedBy' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/20" : "bg-blue-100 text-blue-600 dark:bg-blue-900/20"
            )}>
                {type === 'blockedBy' ? <ShieldAlert className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </div>

            <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate pr-2">{task.title}</span>
                <Badge variant="outline" className="w-fit text-[9px] px-1 h-4 border-gray-200 dark:border-gray-700">
                    {task.status}
                </Badge>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </motion.div>
    );
}

function Connector({ type }: { type: 'incoming' | 'outgoing' }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="w-0.5 h-8 bg-gradient-to-b from-gray-200 to-indigo-500 dark:from-gray-800 dark:to-indigo-500" />
            <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-20" />
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 relative z-10" />
            </div>
            {type === 'outgoing' && <div className="w-0.5 h-8 bg-gradient-to-b from-indigo-500 to-gray-200 dark:from-indigo-500 dark:to-gray-800" />}
        </div>
    );
}

// Dummy ScrollArea if not provided by shadcn correctly in this env
function ScrollArea({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("overflow-auto", className)}>{children}</div>;
}
