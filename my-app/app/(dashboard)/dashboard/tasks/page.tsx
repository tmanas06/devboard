'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useAuth, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar, User, X, Check, AlertCircle, RefreshCw, CheckSquare, Trash2, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { keepPreviousData } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { CardGridSkeleton } from '@/components/skeletons';
import { BulkActionToolbar } from '@/components/bulk-action-toolbar';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { useOrg } from '@/contexts/org-context';
import type { Task, CreateTaskDto, TaskStatus, TaskPriority, User as UserType } from '@/lib/types';
import { TaskStatus as TaskStatusEnum, TaskPriority as TaskPriorityEnum } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { KanbanBoard } from '@/components/kanban-board';
import { Select as UISelect, SelectContent as UISelectContent, SelectItem as UISelectItem, SelectTrigger as UISelectTrigger, SelectValue as UISelectValue } from '@/components/ui/select';


const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatusEnum).optional(),
  priority: z.nativeEnum(TaskPriorityEnum).optional(),
  estimatedHours: z.number().positive().optional(),
  dueDate: z.string().optional(),
  assignedToIds: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

const statusColors: Record<TaskStatus, string> = {
  OPEN: 'bg-sky-100 text-sky-700',
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-purple-100 text-purple-700',
  DONE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-200 text-gray-500',
};

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export default function TasksPage() {
  const { getToken } = useAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const isE2E = process.env.NEXT_PUBLIC_E2E === 'true' || (typeof window !== 'undefined' && window.localStorage.getItem('flow-pilot-e2e') === 'true');
  const user = isE2E ? ({ id: 'e2e-user' } as typeof clerkUser) : clerkUser;
  const userLoaded = isE2E ? true : clerkLoaded;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('kanban');

  const handleStatusFilterChange = (status: TaskStatus | 'ALL') => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleLimitChange = (newLimit: string) => {
    setLimit(parseInt(newLimit));
    setPage(1);
  };
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<TaskStatus | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignUserIds, setBulkAssignUserIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedOrgId, userRole, isLoading: orgLoading } = useOrg();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Get users for org_admins to assign tasks
  const { data: users } = useQuery<UserType[]>({
    queryKey: ['users', selectedOrgId],
    queryFn: async () => {
      const token = await getToken();
      const response = await api.get(`/users?organizationId=${selectedOrgId}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      return response.data;
    },
    enabled: !!user && !!selectedOrgId && userRole === 'ORG_ADMIN',
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatusEnum.TODO,
      priority: TaskPriorityEnum.MEDIUM,
      dueDate: '',
      assignedToIds: [],
    },
  });

  const { data: paginationData, isLoading, isError, refetch, isPlaceholderData } = useQuery<{ items: Task[], total: number, page: number, limit: number, totalPages: number }>({
    queryKey: ['tasks', selectedOrgId, viewMode, statusFilter, selectedUserIds, page, limit],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (viewMode !== 'kanban' && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (selectedUserIds.length > 0) {
        selectedUserIds.forEach(id => params.append('assignedToIds', id));
      }
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      const qs = params.toString();
      const response = await api.get(`/tasks?${qs}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      return response.data;
    },
    enabled: !!user && !!selectedOrgId && userLoaded,
    placeholderData: keepPreviousData,
    refetchInterval: 5000,
  });

  const tasks = paginationData?.items || [];
  const totalItems = paginationData?.total || 0;
  const totalPages = paginationData?.totalPages || 0;

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const token = await getToken();
      const payload: CreateTaskDto = {
        ...data,
        organizationId: selectedOrgId!,
        status: data.status as TaskStatus | undefined,
        priority: data.priority as TaskPriority | undefined,
        estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : undefined,
        assignedToIds: data.assignedToIds && data.assignedToIds.length > 0 ? data.assignedToIds : undefined,
      };
      return api.post('/tasks', payload, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to create task', description: 'Please try again.' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const token = await getToken();
      return api.patch(`/tasks/${id}`, { status }, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to update task', description: 'Please try again.' });
    },
  });

  // ─── Bulk mutations ──────────────────────────────────────────────
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const token = await getToken();
      return api.post('/tasks/bulk-delete', { ids }, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const prev = queryClient.getQueryData<{ items: Task[] }>(['tasks', selectedOrgId, viewMode, statusFilter, page, limit]);
      queryClient.setQueryData<{ items: Task[] }>(['tasks', selectedOrgId, viewMode, statusFilter, page, limit], (old) => ({
        ...old!,
        items: (old?.items || []).filter((t) => !ids.includes(t.id))
      }));
      return { prev };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', selectedOrgId, viewMode, statusFilter, page, limit], ctx.prev);
      toast({ variant: 'destructive', title: 'Bulk delete failed', description: 'Changes have been rolled back.' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds(new Set());
      setBulkDeleteOpen(false);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: TaskStatus }) => {
      const token = await getToken();
      return api.post('/tasks/bulk-status', { ids, status }, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
    },
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const prev = queryClient.getQueryData<{ items: Task[] }>(['tasks', selectedOrgId, viewMode, statusFilter, page, limit]);
      queryClient.setQueryData<{ items: Task[] }>(['tasks', selectedOrgId, viewMode, statusFilter, page, limit], (old) => ({
        ...old!,
        items: (old?.items || []).map((t) => (ids.includes(t.id) ? { ...t, status } : t))
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks', selectedOrgId, viewMode, statusFilter, page, limit], ctx.prev);
      toast({ variant: 'destructive', title: 'Bulk status update failed', description: 'Changes have been rolled back.' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds(new Set());
      setBulkStatusTarget(null);
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ ids, assignedToIds }: { ids: string[]; assignedToIds: string[] }) => {
      const token = await getToken();
      return api.post('/tasks/bulk-assign', { ids, assignedToIds }, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds(new Set());
      setBulkAssignOpen(false);
      setBulkAssignUserIds([]);
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Bulk assign failed', description: 'Please try again.' });
    },
  });

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const onSubmit = (data: TaskFormData) => {
    createMutation.mutate(data);
  };

  const filteredTasks = tasks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-gray-500">Manage your work items</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-md border p-1">
            <div className="flex">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </Button>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter task title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter task description"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="TODO">To Do</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="IN_REVIEW">In Review</SelectItem>
                              <SelectItem value="DONE">Done</SelectItem>
                              <SelectItem value="CLOSED">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                              <SelectItem value="URGENT">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="8"
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {userRole === 'ORG_ADMIN' && users && (
                    <FormField
                      control={form.control}
                      name="assignedToIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign To</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  {field.value && field.value.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {field.value.map((userId) => {
                                        const user = users.find((u) => u.id === userId);
                                        return user ? (
                                          <Badge key={userId} variant="secondary" className="mr-1">
                                            {user.firstName} {user.lastName}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">Select team members</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <div className="max-h-60 overflow-auto p-2">
                                {users && users.length > 0 ? (
                                  <div className="space-y-2">
                                    {users.map((user) => {
                                      const isSelected = field.value?.includes(user.id);
                                      return (
                                        <div
                                          key={user.id}
                                          className="flex items-center space-x-2 cursor-pointer rounded-md p-2 hover:bg-accent"
                                          onClick={() => {
                                            const currentValue = field.value || [];
                                            if (isSelected) {
                                              field.onChange(
                                                currentValue.filter((id) => id !== user.id)
                                              );
                                            } else {
                                              field.onChange([...currentValue, user.id]);
                                            }
                                          }}
                                        >
                                          <div
                                            className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${isSelected
                                              ? 'bg-primary text-primary-foreground'
                                              : 'bg-background'
                                              }`}
                                          >
                                            {isSelected && (
                                              <Check className="h-3 w-3" />
                                            )}
                                          </div>
                                          <label
                                            className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                          >
                                            {user.firstName} {user.lastName} ({user.email})
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground p-2">
                                    No users available
                                  </p>
                                )}
                              </div>
                              {field.value && field.value.length > 0 && (
                                <div className="border-t p-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => field.onChange([])}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Clear all
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {viewMode === 'grid' && (
          <div className="flex gap-2">
            {(['ALL', TaskStatusEnum.OPEN, TaskStatusEnum.TODO, TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.IN_REVIEW, TaskStatusEnum.DONE, TaskStatusEnum.CLOSED] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange(status as TaskStatus | 'ALL')}
              >
                {status === 'ALL' ? 'All' : status.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        )}
        {userRole === 'ORG_ADMIN' && users && (
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="ml-auto">
                {selectedUserIds.length > 0
                  ? `Filtered by ${selectedUserIds.length} user${selectedUserIds.length > 1 ? 's' : ''}`
                  : 'Filter users'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
              <div className="max-h-64 overflow-auto space-y-2">
                {users.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center space-x-2 cursor-pointer rounded-md p-2 hover:bg-accent"
                      onClick={() => {
                        setSelectedUserIds((prev) =>
                          isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                        );
                      }}
                    >
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-background'
                          }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <label className="flex-1 cursor-pointer text-sm">
                        {u.firstName} {u.lastName} ({u.email})
                      </label>
                    </div>
                  );
                })}
              </div>
              {selectedUserIds.length > 0 && (
                <div className="border-t mt-2 pt-2">
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelectedUserIds([])}>
                    <X className="h-4 w-4 mr-2" />
                    Clear selection
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      {viewMode === 'grid' && (
        <BulkActionToolbar
          selectedCount={selectedTaskIds.size}
          totalCount={filteredTasks.length}
          onSelectAll={() => setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)))}
          onDeselectAll={() => setSelectedTaskIds(new Set())}
          actions={[
            {
              label: 'Delete',
              icon: <Trash2 className="h-4 w-4" />,
              variant: 'destructive',
              onClick: () => setBulkDeleteOpen(true),
            },
            {
              label: 'Change Status',
              icon: <RefreshCw className="h-4 w-4" />,
              variant: 'outline',
              onClick: () => setBulkStatusTarget(TaskStatusEnum.DONE),
            },
            ...(userRole === 'ORG_ADMIN' && users ? [{
              label: 'Assign',
              icon: <UserPlus className="h-4 w-4" />,
              variant: 'outline' as const,
              onClick: () => setBulkAssignOpen(true),
            }] : []),
          ]}
        />
      )}

      {/* Bulk Delete Confirmation */}
      <ConfirmationDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? 's' : ''}?`}
        description="This action will soft-delete the selected tasks. They will no longer appear in your task list."
        variant="destructive"
        isPending={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedTaskIds))}
      />

      {/* Bulk Status Change Dialog */}
      <ConfirmationDialog
        open={bulkStatusTarget !== null}
        onOpenChange={(open) => { if (!open) setBulkStatusTarget(null); }}
        title={`Change status of ${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? 's' : ''}?`}
        description={`All selected tasks will be marked as ${bulkStatusTarget?.replace('_', ' ') || ''}.`}
        confirmLabel="Update Status"
        isPending={bulkStatusMutation.isPending}
        onConfirm={() => {
          if (bulkStatusTarget) bulkStatusMutation.mutate({ ids: Array.from(selectedTaskIds), status: bulkStatusTarget });
        }}
      />

      {/* Bulk Assign Dialog */}
      {bulkAssignOpen && (
        <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {users?.map((u) => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={bulkAssignUserIds.includes(u.id)}
                    onCheckedChange={(checked) => {
                      setBulkAssignUserIds((prev) =>
                        checked ? [...prev, u.id] : prev.filter((id) => id !== u.id),
                      );
                    }}
                  />
                  <span className="text-sm">{u.firstName} {u.lastName}</span>
                </label>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>Cancel</Button>
                <Button
                  disabled={bulkAssignMutation.isPending}
                  onClick={() => bulkAssignMutation.mutate({ ids: Array.from(selectedTaskIds), assignedToIds: bulkAssignUserIds })}
                >
                  {bulkAssignMutation.isPending ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Tasks */}
      {isLoading || orgLoading ? (
        <CardGridSkeleton count={6} />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-gray-500">Failed to load tasks.</p>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : !tasks || tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckSquare className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No tasks found. Create your first task!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTasks.map((task) => (
                  <Card
                    key={task.id}
                    className={`hover:shadow-md transition-shadow ${selectedTaskIds.has(task.id) ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedTaskIds.has(task.id)}
                            onCheckedChange={() => toggleTaskSelection(task.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                        </div>
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Badge className={statusColors[task.status]}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        {task.estimatedHours && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {task.estimatedHours}h
                          </span>
                        )}
                      </div>
                      {task.assignedTo && task.assignedTo.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {task.assignedTo.map((user) => (
                              <span key={user.id} className="text-gray-600">
                                {user.firstName} {user.lastName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {task.dueDate && (
                        <p className="text-xs text-gray-500">
                          Due: {formatDate(task.dueDate)}
                        </p>
                      )}
                      <div className="flex gap-2 pt-2">
                        {task.status !== TaskStatusEnum.DONE && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: task.id,
                                status:
                                  task.status === TaskStatusEnum.TODO
                                    ? TaskStatusEnum.IN_PROGRESS
                                    : TaskStatusEnum.DONE,
                              })
                            }
                          >
                            {task.status === TaskStatusEnum.TODO ? 'Start' : 'Complete'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground order-2 sm:order-1">
                  <span>Show</span>
                  <UISelect value={limit.toString()} onValueChange={handleLimitChange}>
                    <UISelectTrigger className="h-8 w-20">
                      <UISelectValue />
                    </UISelectTrigger>
                    <UISelectContent>
                      <UISelectItem value="5">5</UISelectItem>
                      <UISelectItem value="10">10</UISelectItem>
                      <UISelectItem value="25">25</UISelectItem>
                      <UISelectItem value="50">50</UISelectItem>
                    </UISelectContent>
                  </UISelect>
                  <span>per page</span>
                  <span className="hidden sm:inline mx-2">•</span>
                  <span>Total {totalItems} tasks</span>
                </div>

                <div className="order-1 sm:order-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .map((p, i, arr) => {
                          const showEllipsis = i > 0 && p - arr[i - 1] > 1;
                          return (
                            <React.Fragment key={p}>
                              {showEllipsis && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink
                                  isActive={page === p}
                                  onClick={() => setPage(p)}
                                  className="cursor-pointer"
                                >
                                  {p}
                                </PaginationLink>
                              </PaginationItem>
                            </React.Fragment>
                          );
                        })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </div>
          ) : (
            <KanbanBoard tasks={filteredTasks} />
          )}
        </>
      )}
    </div>
  );
}
