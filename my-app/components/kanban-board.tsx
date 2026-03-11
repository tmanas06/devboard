'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { TaskStatus as TaskStatusEnum } from '@/lib/types';

// ─── Column definitions (6 statuses) ─────────────────────────────────
const COLUMNS: {
    id: TaskStatus;
    label: string;
    color: string;
    dotColor: string;
    bgAccent: string;
}[] = [
        {
            id: TaskStatusEnum.OPEN,
            label: 'Open',
            color: 'text-sky-600 dark:text-sky-400',
            dotColor: 'bg-sky-500',
            bgAccent: 'bg-sky-500/10 border-sky-500/20',
        },
        {
            id: TaskStatusEnum.TODO,
            label: 'To Do',
            color: 'text-blue-600 dark:text-blue-400',
            dotColor: 'bg-blue-500',
            bgAccent: 'bg-blue-500/10 border-blue-500/20',
        },
        {
            id: TaskStatusEnum.IN_PROGRESS,
            label: 'In Progress',
            color: 'text-amber-600 dark:text-amber-400',
            dotColor: 'bg-amber-500',
            bgAccent: 'bg-amber-500/10 border-amber-500/20',
        },
        {
            id: TaskStatusEnum.IN_REVIEW,
            label: 'In Review',
            color: 'text-purple-600 dark:text-purple-400',
            dotColor: 'bg-purple-500',
            bgAccent: 'bg-purple-500/10 border-purple-500/20',
        },
        {
            id: TaskStatusEnum.DONE,
            label: 'Done',
            color: 'text-emerald-600 dark:text-emerald-400',
            dotColor: 'bg-emerald-500',
            bgAccent: 'bg-emerald-500/10 border-emerald-500/20',
        },
        {
            id: TaskStatusEnum.CLOSED,
            label: 'Closed',
            color: 'text-gray-500 dark:text-gray-400',
            dotColor: 'bg-gray-400',
            bgAccent: 'bg-gray-400/10 border-gray-400/20',
        },
    ];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; border: string }> = {
    LOW: {
        label: 'Low',
        color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        border: 'border-l-slate-400',
    },
    MEDIUM: {
        label: 'Medium',
        color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        border: 'border-l-yellow-400',
    },
    HIGH: {
        label: 'High',
        color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        border: 'border-l-orange-500',
    },
    URGENT: {
        label: 'Urgent',
        color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        border: 'border-l-red-500',
    },
};

// ─── Component Props ──────────────────────────────────────────────────
interface KanbanBoardProps {
    tasks?: Task[]; // Make tasks optional since we'll fetch them if not provided
    organizationId?: string; // Add organizationId prop
}

export function KanbanBoard({ tasks: initialTasks, organizationId }: KanbanBoardProps) {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    // ─── Fetch tasks for Kanban board ────────────────────────────────
    const { data: fetchedTasks } = useQuery({
        queryKey: ['tasks', 'board', organizationId],
        queryFn: async () => {
            const token = await getToken();
            const params = new URLSearchParams();
            if (organizationId) {
                params.append('organizationId', organizationId);
            }
            const qs = params.toString();
            // We use the same /tasks endpoint but without pagination limits to get all tasks for the board
            // The backend /tasks/board endpoint already groups them
            const response = await api.get(`/tasks?limit=1000${qs ? '&' + qs : ''}`, {
                headers: { Authorization: token ? `Bearer ${token}` : undefined },
            });
            return response.data.items as Task[];
        },
        enabled: !initialTasks, // Only fetch if tasks weren't provided directly
        refetchInterval: 5000,
    });

    const tasks = initialTasks || fetchedTasks || [];

    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
    const dragCounter = useRef<Record<string, number>>({});

    // ─── Touch drag state ─────────────────────────────────────────────
    const touchDragTask = useRef<{ id: string; fromStatus: TaskStatus } | null>(null);
    const touchClone = useRef<HTMLElement | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Status update mutation (uses dedicated /status endpoint) ─────
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
            const token = await getToken();
            return api.patch(
                `/tasks/${id}/status`,
                { status },
                { headers: { Authorization: token ? `Bearer ${token}` : undefined } }
            );
        },
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['tasks'] });
            
            // Optimistically update initial tasks query
            if (!initialTasks) {
                const previousTasks = queryClient.getQueryData<Task[]>(['tasks', 'board', organizationId]);
                queryClient.setQueriesData<Task[]>({ queryKey: ['tasks', 'board', organizationId] }, (old) =>
                    old?.map((t) => (t.id === id ? { ...t, status } : t))
                );
                return { previousTasks };
            }
            return { previousTasks: null };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousTasks && !initialTasks) {
                queryClient.setQueriesData({ queryKey: ['tasks', 'board', organizationId] }, context.previousTasks);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    // ─── Group tasks by status ────────────────────────────────────────
    const grouped = (tasks as Task[]).reduce(
        (acc, task) => {
            if (!acc[task.status]) acc[task.status] = [];
            acc[task.status].push(task);
            return acc;
        },
        {} as Record<TaskStatus, Task[]>
    );

    // ─── Desktop drag handlers ────────────────────────────────────────
    const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = '0.4';
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.style.opacity = '1';
        setDraggedTaskId(null);
        setDragOverColumn(null);
        dragCounter.current = {};
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent, columnId: TaskStatus) => {
        e.preventDefault();
        dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) + 1;
        setDragOverColumn(columnId);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent, columnId: TaskStatus) => {
        e.preventDefault();
        dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) - 1;
        if (dragCounter.current[columnId] <= 0) {
            dragCounter.current[columnId] = 0;
            setDragOverColumn((prev) => (prev === columnId ? null : prev));
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent, columnId: TaskStatus) => {
            e.preventDefault();
            setDragOverColumn(null);
            dragCounter.current = {};

            if (!draggedTaskId) return;
            const task = tasks.find((t) => t.id === draggedTaskId);
            if (!task || task.status === columnId) return;

            updateStatusMutation.mutate({ id: draggedTaskId, status: columnId });
        },
        [draggedTaskId, tasks, updateStatusMutation]
    );

    // ─── Touch drag handlers ──────────────────────────────────────────
    const handleTouchStart = useCallback(
        (e: React.TouchEvent, taskId: string, fromStatus: TaskStatus) => {
            longPressTimer.current = setTimeout(() => {
                touchDragTask.current = { id: taskId, fromStatus };
                const el = e.currentTarget as HTMLElement;
                const clone = el.cloneNode(true) as HTMLElement;
                clone.style.cssText = `
                    position: fixed; opacity: 0.85; pointer-events: none; z-index: 9999;
                    width: ${el.offsetWidth}px; transform: scale(1.04);
                    border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.25);
                `;
                document.body.appendChild(clone);
                touchClone.current = clone;
                el.style.opacity = '0.4';
            }, 300);
        },
        []
    );

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchDragTask.current) return;
        e.preventDefault();
        const touch = e.touches[0];
        if (touchClone.current) {
            touchClone.current.style.left = `${touch.clientX - 80}px`;
            touchClone.current.style.top = `${touch.clientY - 40}px`;
        }
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const col = el?.closest('[data-status]') as HTMLElement | null;
        setDragOverColumn((col?.dataset.status as TaskStatus) ?? null);
    }, []);

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent, originalEl: HTMLElement) => {
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
            if (!touchDragTask.current) return;

            const touch = e.changedTouches[0];
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const col = el?.closest('[data-status]') as HTMLElement | null;
            const toStatus = col?.dataset.status as TaskStatus | undefined;

            // Clean up
            touchClone.current?.remove();
            touchClone.current = null;
            originalEl.style.opacity = '';
            setDragOverColumn(null);

            if (toStatus && toStatus !== touchDragTask.current.fromStatus) {
                updateStatusMutation.mutate({ id: touchDragTask.current.id, status: toStatus });
            }

            touchDragTask.current = null;
        },
        [updateStatusMutation]
    );

    // ─── Render ───────────────────────────────────────────────────────
    return (
        <div className="flex gap-4 h-[calc(100vh-220px)] overflow-x-auto pb-4 kanban-scrollbar">
            {COLUMNS.map((column) => {
                const columnTasks = grouped[column.id] || [];
                const isOver = dragOverColumn === column.id;

                return (
                    <div
                        key={column.id}
                        className="flex-shrink-0 w-[260px] flex flex-col"
                        data-status={column.id}
                        onDragEnter={(e) => handleDragEnter(e, column.id)}
                        onDragLeave={(e) => handleDragLeave(e, column.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Column Container */}
                        <div
                            className={cn(
                                'rounded-xl border h-full flex flex-col transition-all duration-200',
                                'bg-card',
                                'border-border',
                                isOver && 'ring-2 ring-indigo-400/60 border-indigo-300 dark:border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20'
                            )}
                        >
                            {/* Column Header */}
                            <div className="px-4 py-3.5 border-b border-border flex items-center gap-3 shrink-0">
                                <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', column.dotColor)} />
                                <h3 className={cn('text-xs font-semibold uppercase tracking-wide', column.color)}>
                                    {column.label}
                                </h3>
                                <span
                                    className={cn(
                                        'ml-auto text-xs font-bold px-2 py-0.5 rounded-full border transition-transform',
                                        column.bgAccent,
                                        isOver && 'scale-110'
                                    )}
                                >
                                    {columnTasks.length}
                                </span>
                            </div>

                            {/* Card List */}
                            <div
                                className={cn(
                                    'flex-1 overflow-y-auto p-3 space-y-3 kanban-column-scroll',
                                    columnTasks.length === 0 && 'flex items-center justify-center'
                                )}
                            >
                                {columnTasks.length === 0 ? (
                                    <p className="text-xs text-gray-400 dark:text-gray-600 italic select-none">
                                        Drop tasks here
                                    </p>
                                ) : (
                                    columnTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isDragging={draggedTaskId === task.id}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                            onTouchStart={handleTouchStart}
                                            onTouchMove={handleTouchMove}
                                            onTouchEnd={handleTouchEnd}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Task Card ────────────────────────────────────────────────────────
interface TaskCardProps {
    task: Task;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onTouchStart: (e: React.TouchEvent, id: string, status: TaskStatus) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent, el: HTMLElement) => void;
}

function TaskCard({
    task,
    isDragging,
    onDragStart,
    onDragEnd,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
}: TaskCardProps) {
    const elRef = useRef<HTMLDivElement>(null);
    const priority = PRIORITY_CONFIG[task.priority];

    return (
        <Link href={`/dashboard/tasks/${task.id}`}>
            <div
                ref={elRef}
                draggable
                onDragStart={(e) => onDragStart(e, task.id)}
                onDragEnd={onDragEnd}
                onTouchStart={(e) => onTouchStart(e, task.id, task.status)}
                onTouchMove={onTouchMove}
                onTouchEnd={(e) => onTouchEnd(e, elRef.current!)}
                className={cn(
                    'group relative rounded-lg border-l-[3px] bg-card',
                    'border border-border',
                    'p-3.5 cursor-grab active:cursor-grabbing select-none touch-none',
                    'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600',
                    'transition-all duration-200',
                    priority.border,
                    isDragging && 'opacity-40 scale-95 shadow-none'
                )}
            >
                {/* Drag Handle */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                </div>

                {/* Title */}
                <h4 className="text-sm font-medium text-foreground leading-snug pr-6 mb-2.5">
                    {task.title}
                </h4>

                {/* Description Preview */}
                {task.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                        {task.description}
                    </p>
                )}

                {/* Tags Row */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <Badge
                        variant="secondary"
                        className={cn(
                            'text-[10px] font-semibold px-1.5 py-0 h-5 uppercase tracking-wider rounded',
                            priority.color
                        )}
                    >
                        {priority.label}
                    </Badge>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                    <div className="flex items-center gap-3">
                        {task.estimatedHours && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.estimatedHours}h
                            </span>
                        )}
                        {task.dueDate && (
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.dueDate)}
                            </span>
                        )}
                    </div>

                    {/* Assignee Avatars */}
                    {task.assignedTo && task.assignedTo.length > 0 && (
                        <div className="flex -space-x-1.5">
                            {task.assignedTo.slice(0, 3).map((user) => {
                                const initials = `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() || '?';
                                return (
                                    <div
                                        key={user.id}
                                        className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[9px] font-bold border-2 border-white dark:border-gray-800 ring-0"
                                        title={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                                    >
                                        {initials}
                                    </div>
                                );
                            })}
                            {task.assignedTo.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 flex items-center justify-center text-[9px] font-bold border-2 border-white dark:border-gray-800">
                                    +{task.assignedTo.length - 3}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
