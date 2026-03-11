'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useAuth, useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';
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
  FormDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Calendar, Clock, Trash2, X, Check, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { TableSkeleton, StatCardSkeleton } from '@/components/skeletons';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkActionToolbar } from '@/components/bulk-action-toolbar';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { useOrg } from '@/contexts/org-context';
import type { TimeEntry, CreateTimeEntryDto, Task } from '@/lib/types';
import { formatDateTime, formatHours } from '@/lib/utils';
import {
  Select as UISelect,
  SelectContent as UISelectContent,
  SelectItem as UISelectItem,
  SelectTrigger as UISelectTrigger,
  SelectValue as UISelectValue,
} from "@/components/ui/select"

const timeEntrySchema = z.object({
  taskIds: z.array(z.string()).optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  hours: z.number()
    .positive('Hours must be positive')
    .max(24, 'Maximum 24 hours allowed per entry'),
  description: z.string().optional(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

export default function TimeEntriesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [view, setView] = useState<'my' | 'team'>('my');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';
  const user = isE2E ? ({ id: 'e2e-user' } as typeof clerkUser) : clerkUser;
  const userLoaded = isE2E ? true : clerkLoaded;
  const { selectedOrgId, userRole, isLoading: orgLoading } = useOrg();
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const { toast } = useToast();
  const isUpdatingFromHours = React.useRef(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value);
    setPage(1);
  };

  const handleLimitChange = (newLimit: string) => {
    setLimit(parseInt(newLimit));
    setPage(1);
  };

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      taskIds: [],
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '13:00',
      hours: 4,
    },
  });

  const { data: paginationData, isLoading, isError, refetch, isPlaceholderData } = useQuery<{ items: TimeEntry[], total: number, page: number, limit: number, totalPages: number }>({
    queryKey: ['time-entries', selectedOrgId, view, dateFilter, selectedMemberIds, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter) {
        const startDate = new Date(dateFilter);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
        params.append('startDate', startDate.toISOString());
        params.append('endDate', endDate.toISOString());
      }
      if (view === 'my' && user) {
        params.append('userIds', user.id);
      } else if (selectedMemberIds.length > 0) {
        selectedMemberIds.forEach(id => params.append('userIds', id));
      }
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      const token = await getToken();
      const response = await api.get(`/time-entries?${params.toString()}`, {
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

  const timeEntries = paginationData?.items || [];
  const totalItems = paginationData?.total || 0;
  const totalPages = paginationData?.totalPages || 0;

  // Watch for time changes to auto-calculate hours
  const watchStartTime = form.watch('startTime');
  const watchEndTime = form.watch('endTime');
  const watchHours = form.watch('hours');
  const watchDate = form.watch('date');

  // Update hours when start/end time changes
  React.useEffect(() => {
    // Skip if we're updating from hours field to prevent infinite loop
    if (isUpdatingFromHours.current) {
      isUpdatingFromHours.current = false;
      return;
    }

    if (watchStartTime && watchEndTime) {
      const [startHour, startMin] = watchStartTime.split(':').map(Number);
      const [endHour, endMin] = watchEndTime.split(':').map(Number);
      let hours = (endHour * 60 + endMin - (startHour * 60 + startMin)) / 60;

      // Handle midnight crossing
      if (hours <= 0) {
        hours += 24;
      }

      if (hours > 0) {
        // Cap at 24 hours maximum
        const cappedHours = Math.min(hours, 24);
        form.setValue('hours', Number(cappedHours.toFixed(2)), { shouldValidate: false });

        // If capped, adjust end time to match 24 hours (which would be same as start time)
        if (hours > 24) {
          const newEndTime = new Date();
          const startDate = new Date(`${watchDate}T${watchStartTime}:00`);
          newEndTime.setTime(startDate.getTime() + 24 * 60 * 60 * 1000);
          const newEndTimeStr = `${String(newEndTime.getHours()).padStart(2, '0')}:${String(newEndTime.getMinutes()).padStart(2, '0')}`;
          form.setValue('endTime', newEndTimeStr, { shouldValidate: false });
        }
      }
    }
  }, [watchStartTime, watchEndTime, watchDate, form]);

  // Update end time when hours changes
  React.useEffect(() => {
    if (watchStartTime && watchHours && watchHours > 0 && watchDate) {
      const cappedHours = Math.min(watchHours, 24);
      const startDate = new Date(`${watchDate}T${watchStartTime}:00`);
      const newEndTime = new Date(startDate.getTime() + cappedHours * 60 * 60 * 1000);
      const newEndTimeStr = `${String(newEndTime.getHours()).padStart(2, '0')}:${String(newEndTime.getMinutes()).padStart(2, '0')}`;

      // Only update if the calculated end time is different from current end time
      const currentEndTime = form.getValues('endTime');
      if (currentEndTime !== newEndTimeStr) {
        isUpdatingFromHours.current = true;
        form.setValue('endTime', newEndTimeStr, { shouldValidate: false });
        // Also update hours to ensure it's capped at 24
        if (watchHours !== cappedHours) {
          form.setValue('hours', cappedHours, { shouldValidate: false });
        }
      }
    }
  }, [watchHours, watchStartTime, watchDate, form]);

  // Pre-fill form with last entry's end time and hours when dialog opens
  React.useEffect(() => {
    if (isCreateOpen && timeEntries && timeEntries.length > 0) {
      const lastEntry = timeEntries[0]; // Entries are sorted by startTime desc
      const lastEndTime = new Date(lastEntry.endTime);
      const lastHours = lastEntry.hours;

      // Use last entry's date and end time as new start time
      const lastDate = format(lastEndTime, 'yyyy-MM-dd');
      const newStartTime = format(lastEndTime, 'HH:mm');
      // Calculate new end time (start + last hours, capped at 24 hours)
      const cappedHours = Math.min(lastHours, 24);
      const newEndTime = new Date(lastEndTime.getTime() + cappedHours * 60 * 60 * 1000);
      const newEndTimeStr = format(newEndTime, 'HH:mm');

      form.setValue('date', lastDate);
      form.setValue('startTime', newStartTime);
      form.setValue('endTime', newEndTimeStr);
      form.setValue('hours', cappedHours);
    }
  }, [isCreateOpen, timeEntries, form]);

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ['tasks-list'],
    queryFn: async () => {
      const token = await getToken();
      const response = await api.get(`/tasks`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      return response.data;
    },
  });

  const { data: teamSummary } = useQuery<{
    summary: { totalHours: number; entriesCount: number };
    byUser: Array<{
      user: { id: string; firstName: string | null; lastName: string | null };
      totalHours: number;
      entriesCount: number;
    }>;
  }>({
    queryKey: ['time-summary', dateFilter, view],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter) {
        const startDate = new Date(dateFilter);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateFilter);
        endDate.setHours(23, 59, 59, 999);
        params.append('startDate', startDate.toISOString());
        params.append('endDate', endDate.toISOString());
      }
      const token = await getToken();
      const response = await api.get(`/time-entries/reports/summary?${params}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      return response.data;
    },
    enabled: view === 'team' && !orgLoading && !!selectedOrgId && userRole === 'ORG_ADMIN',
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TimeEntryFormData) => {
      const startDateTime = new Date(`${data.date}T${data.startTime}:00`);
      const endDateTime = new Date(`${data.date}T${data.endTime}:00`);

      const payload: CreateTimeEntryDto = {
        taskIds: data.taskIds && data.taskIds.length > 0 ? data.taskIds : undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        hours: data.hours,
        description: data.description,
      };

      // Get token and add to request
      const token = await getToken();
      return api.post('/time-entries', payload, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-summary'] });
      setIsCreateOpen(false);
      // Don't reset - let the useEffect handle pre-filling from last entry
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Failed to log time', description: error?.response?.data?.message || 'Please try again.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.delete(`/time-entries/${id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-summary'] });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to delete entry', description: 'Please try again.' });
    },
  });

  const onSubmit = (data: TimeEntryFormData) => {
    createMutation.mutate(data);
  };

  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };

  const totalHours = timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0;

  // ─── Bulk delete mutation ────────────────────────────────────────
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const token = await getToken();
      return api.post('/time-entries/bulk-delete', { ids }, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['time-entries'] });
      const key = ['time-entries', selectedOrgId, view, dateFilter, page, limit];
      const prev = queryClient.getQueryData<{ items: TimeEntry[] }>(key);
      queryClient.setQueryData<{ items: TimeEntry[] }>(key, (old) => ({
        ...old!,
        items: (old?.items || []).filter((e) => !ids.includes(e.id))
      }));
      return { prev, key };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
      toast({ variant: 'destructive', title: 'Bulk delete failed', description: 'Changes have been rolled back.' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['time-summary'] });
      setSelectedEntryIds(new Set());
      setBulkDeleteOpen(false);
    },
  });

  const toggleEntrySelection = (id: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!userLoaded || orgLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Time Entries</h1>
          <p className="text-gray-500">Track your work hours</p>
        </div>
        <StatCardSkeleton count={2} />
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time Entries</h1>
          <p className="text-gray-500">
            {view === 'my' ? 'Track your work hours' : 'Organization overview'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userRole === 'ORG_ADMIN' && (
            <div className="rounded-md border p-1">
              <div className="flex">
                <Button
                  variant={view === 'my' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('my')}
                >
                  My Time
                </Button>
                <Button
                  variant={view === 'team' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('team')}
                >
                  Team Overview
                </Button>
              </div>
            </div>
          )}
          {view === 'team' && userRole === 'ORG_ADMIN' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline">
                  {selectedMemberIds.length > 0
                    ? `Filtered by ${selectedMemberIds.length} member${selectedMemberIds.length > 1 ? 's' : ''}`
                    : 'Filter members'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                <div className="max-h-64 overflow-auto space-y-2">
                  {(teamSummary?.byUser || []).map((row) => {
                    const id = row.user.id;
                    const isSelected = selectedMemberIds.includes(id);
                    return (
                      <div
                        key={id}
                        className="flex items-center space-x-2 cursor-pointer rounded-md p-2 hover:bg-accent"
                        onClick={() => {
                          setSelectedMemberIds((prev) =>
                            isSelected ? prev.filter((x) => x !== id) : [...prev, id],
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
                          {(row.user.firstName || '') + ' ' + (row.user.lastName || '')}
                        </label>
                      </div>
                    );
                  })}
                </div>
                {selectedMemberIds.length > 0 && (
                  <div className="border-t mt-2 pt-2">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelectedMemberIds([])}>
                      <X className="h-4 w-4 mr-2" />
                      Clear selection
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Log Time Entry</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="taskIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tasks (Optional)</FormLabel>
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
                                    {field.value.map((taskId) => {
                                      const task = tasks?.find((t) => t.id === taskId);
                                      return task ? (
                                        <Badge key={taskId} variant="secondary" className="mr-1">
                                          {task.title}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Select tasks</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <div className="max-h-60 overflow-auto p-2">
                              {tasks && tasks.length > 0 ? (
                                <div className="space-y-2">
                                  {tasks.map((task) => {
                                    const isSelected = field.value?.includes(task.id);
                                    return (
                                      <div
                                        key={task.id}
                                        className="flex items-center space-x-2 cursor-pointer rounded-md p-2 hover:bg-accent"
                                        onClick={() => {
                                          const currentValue = field.value || [];
                                          if (isSelected) {
                                            field.onChange(
                                              currentValue.filter((id) => id !== task.id)
                                            );
                                          } else {
                                            field.onChange([...currentValue, task.id]);
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
                                          {task.title}
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground p-2">
                                  No tasks available
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
                        <FormDescription>
                          Select one or more tasks to link this time entry to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.25"
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What did you work on?"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Saving...' : 'Log Time'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {view === 'my' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(totalHours)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entries</CardTitle>
                <Calendar className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeEntries?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Action Toolbar */}
          <BulkActionToolbar
            selectedCount={selectedEntryIds.size}
            totalCount={timeEntries?.length || 0}
            onSelectAll={() => setSelectedEntryIds(new Set((timeEntries || []).map((e) => e.id)))}
            onDeselectAll={() => setSelectedEntryIds(new Set())}
            actions={[{
              label: 'Delete',
              icon: <Trash2 className="h-4 w-4" />,
              variant: 'destructive',
              onClick: () => setBulkDeleteOpen(true),
            }]}
          />

          <ConfirmationDialog
            open={bulkDeleteOpen}
            onOpenChange={setBulkDeleteOpen}
            title={`Delete ${selectedEntryIds.size} time entr${selectedEntryIds.size > 1 ? 'ies' : 'y'}?`}
            description="This action will permanently delete the selected time entries. This cannot be undone."
            variant="destructive"
            isPending={bulkDeleteMutation.isPending}
            onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedEntryIds))}
          />
        </>
      ) : (
        <div className="space-y-6">
          {/* Member summary grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(teamSummary?.byUser || [])
              .filter((row) => selectedMemberIds.length === 0 || selectedMemberIds.includes(row.user.id))
              .map((row) => (
                <Card key={row.user.id} className="cursor-default">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {(row.user.firstName || '') + ' ' + (row.user.lastName || '')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Hours</span>
                      <span className="font-semibold">{formatHours(row.totalHours)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entries</span>
                      <span className="font-semibold">{row.entriesCount}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Selected members entries */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedMemberIds.length > 0
                  ? 'Selected Members Time Log'
                  : 'All Members Time Log'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : !timeEntries || timeEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Inbox className="h-10 w-10 text-gray-300" />
                  <p className="text-center text-gray-500">
                    No time entries found for the selected period.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={
                            timeEntries && timeEntries.length > 0 &&
                            timeEntries
                              .filter((e) => selectedMemberIds.length === 0 || selectedMemberIds.includes(e.user?.id || e.userId))
                              .every((e) => selectedEntryIds.has(e.id))
                          }
                          onCheckedChange={(checked) => {
                            const visible = (timeEntries || [])
                              .filter((e) => selectedMemberIds.length === 0 || selectedMemberIds.includes(e.user?.id || e.userId));
                            if (checked) {
                              setSelectedEntryIds(new Set(visible.map((e) => e.id)));
                            } else {
                              setSelectedEntryIds(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries
                      .filter((e) => selectedMemberIds.length === 0 || selectedMemberIds.includes(e.user?.id || e.userId))
                      .map((entry) => (
                        <TableRow
                          key={entry.id}
                          className={selectedEntryIds.has(entry.id) ? 'bg-blue-50/50' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedEntryIds.has(entry.id)}
                              onCheckedChange={() => toggleEntrySelection(entry.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{formatDateTime(entry.startTime)}</TableCell>
                          <TableCell className="text-sm">
                            {(entry.user?.firstName || '') + ' ' + (entry.user?.lastName || '')}
                          </TableCell>
                          <TableCell>
                            {entry.tasks && entry.tasks.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {entry.tasks.map((task) => (
                                  <span key={task.id} className="text-sm">
                                    {task.title}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">General</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm line-clamp-2">{entry.description}</p>
                          </TableCell>
                          <TableCell className="font-semibold">{formatHours(entry.hours)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 mt-4 bg-muted/30 rounded-lg border border-border/50">
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
                  <span>Total {totalItems} entries</span>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Filter */}
      <div className="flex gap-2">
        <Input
          type="date"
          value={dateFilter}
          onChange={handleDateFilterChange}
          className="w-64"
          placeholder="Filter by date"
        />
        {dateFilter && (
          <Button variant="outline" onClick={() => handleDateFilterChange({ target: { value: '' } } as any)}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
