'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { format, subDays } from 'date-fns';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, TrendingUp, Users, CheckSquare, AlertCircle, RefreshCw, BarChart3, Download, FileText, FileSpreadsheet, Filter } from 'lucide-react';
import { StatCardSkeleton, TableSkeleton } from '@/components/skeletons';
import { useOrg } from '@/contexts/org-context';
import type { TimeSummary, User, Task } from '@/lib/types';
import { formatHours } from '@/lib/utils';

export default function ReportsPage() {
  const { getToken } = useAuth();
  const { selectedOrgId, isLoading: orgLoading } = useOrg();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [userId, setUserId] = useState<string>('all');
  const [taskId, setTaskId] = useState<string>('all');

  // Fetch users for filtering
  const { data: teamMembers } = useQuery<User[]>({
    queryKey: ['org-users', selectedOrgId],
    queryFn: async () => {
      const token = await getToken();
      const response = await api.get('/users', {
        params: { organizationId: selectedOrgId },
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      return response.data;
    },
    enabled: !!selectedOrgId,
  });

  // Fetch tasks for filtering
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ['org-tasks', selectedOrgId],
    queryFn: async () => {
      const token = await getToken();
      const response = await api.get('/tasks', {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      return response.data;
    },
    enabled: !!selectedOrgId,
  });

  const { data: summary, isLoading, isError, refetch } = useQuery<TimeSummary>({
    queryKey: ['time-summary-report', selectedOrgId, startDate, endDate, userId, taskId],
    queryFn: async () => {
      const params = new URLSearchParams({ organizationId: selectedOrgId! });
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        params.append('startDate', start.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.append('endDate', end.toISOString());
      }
      if (userId !== 'all') params.append('userId', userId);
      if (taskId !== 'all') params.append('taskId', taskId);
      const token = await getToken();
      const response = await api.get(`/time-entries/reports/summary?${params}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      return response.data;
    },
    enabled: !!selectedOrgId && !orgLoading,
    refetchInterval: 5000,
  });

  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!selectedOrgId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        organizationId: selectedOrgId,
      });
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        params.append('startDate', start.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.append('endDate', end.toISOString());
      }
      if (userId !== 'all') params.append('userId', userId);
      if (taskId !== 'all') params.append('taskId', taskId);

      const token = await getToken();
      const response = await api.get(`/time-entries/reports/export?${params}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `time-entries.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Error toast handled by global axios interceptor
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    {
      title: 'Total Hours',
      value: formatHours(summary?.summary.totalHours || 0),
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Time Entries',
      value: summary?.summary.entriesCount || 0,
      icon: CheckSquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Average Hours',
      value: summary?.summary.entriesCount
        ? formatHours(summary.summary.totalHours / summary.summary.entriesCount)
        : '0h',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-gray-500">Analyze your time tracking data</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={exporting || isLoading} className="gap-2">
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
              }}
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
              }}
            >
              Last 7 Days
            </Button>
          </div>

          <div className="flex gap-4 mt-6 pt-6 border-t">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Team Member</label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {teamMembers?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Task</label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  {tasks?.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setUserId('all');
                  setTaskId('all');
                  setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                  setEndDate(format(new Date(), 'yyyy-MM-dd'));
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">
                {summary?.summary.entriesCount || 0} entries
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <>
          <StatCardSkeleton count={3} />
          <TableSkeleton rows={4} cols={3} />
        </>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-gray-500">Failed to load report data.</p>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : !summary ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <BarChart3 className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No data available for the selected date range</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Time by User */}
          {summary.byUser && summary.byUser.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <CardTitle>Time by Team Member</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.byUser.map((item) => (
                      <TableRow key={item.user.id}>
                        <TableCell className="font-medium">
                          {item.user.firstName} {item.user.lastName}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatHours(item.totalHours)}
                        </TableCell>
                        <TableCell className="text-right">{item.entriesCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Time by Task */}
          {summary.byTask && summary.byTask.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-purple-600" />
                  <CardTitle>Time by Task</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.byTask.map((item) => (
                      <TableRow key={item.task.id}>
                        <TableCell className="font-medium">{item.task.title}</TableCell>
                        <TableCell className="text-right">
                          {formatHours(item.totalHours)}
                        </TableCell>
                        <TableCell className="text-right">{item.entriesCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
