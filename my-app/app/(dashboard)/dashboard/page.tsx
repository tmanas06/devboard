'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, AlertCircle, RefreshCw, Terminal, Activity, ArrowRight } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { useOrg } from '@/contexts/org-context';
import type { Task, ActivityLog, TaskStatus } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { selectedOrgId, isLoading: orgLoading } = useOrg();

  // Fetch all tasks for the organization
  const { data: tasks, isLoading: loadingTasks, isError: isTasksError, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['tasks', selectedOrgId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');
      const response = await api.get('/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.items || [];
    },
    enabled: !!selectedOrgId && !orgLoading,
    refetchInterval: 5000,
  });

  // Fetch recent activity (notes/events)
  const { data: activityLogs, isLoading: loadingActivity, isError: isActivityError, refetch: refetchActivity } = useQuery<{items: ActivityLog[]}>({
    queryKey: ['recent-activity', selectedOrgId],
    queryFn: async () => {
      const token = await getToken();
      const response = await api.get('/activity?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!selectedOrgId && !orgLoading,
    refetchInterval: 5000,
  });

  const isLoading = orgLoading || loadingTasks || loadingActivity;
  const isError = isTasksError || isActivityError;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Terminal className="h-10 w-10 animate-pulse text-[#00f3ff]" />
        <span className="ml-4 font-mono text-[#00f3ff] text-xl uppercase tracking-widest">Loading Mainframe...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-pink-500 uppercase">System Error</h1>
        </div>
        <Card className="border-[#ff0033] bg-[#0d0d0d] glow-primary shadow-[0_0_10px_#ff0033]">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-10 w-10 text-[#ff0033]" />
            <p className="text-[#00f3ff] font-mono uppercase tracking-widest">Failed to decrypt data stream.</p>
            <Button variant="outline" onClick={() => { refetchTasks(); refetchActivity(); }} className="gap-2 border-[#00f3ff] text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black">
              <RefreshCw className="h-4 w-4" />
              Re-Establish Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allTasks = tasks || [];
  const upcomingTasks = allTasks.filter(t => t.status === 'TODO' || t.status === 'OPEN' || t.status === 'IN_PROGRESS').slice(0, 5);
  const completedTasks = allTasks.filter(t => t.status === 'DONE' || t.status === 'CLOSED').slice(0, 5);
  const logs = activityLogs?.items || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-widest text-[#ff00ff] uppercase">Command Center</h1>
        <p className="text-cyan-500 font-mono tracking-widest mt-1 text-sm">// SYSTEM_OVERVIEW.EXE</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Tasks */}
        <Card className="border-[#00f3ff] bg-[#0d0d0d] glow-secondary col-span-1 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#00f3ff]/20 pb-4">
            <CardTitle className="text-lg font-bold tracking-widest text-[#00f3ff] uppercase flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-pink-500" />
              Active Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {upcomingTasks.length === 0 ? (
              <p className="text-gray-500 font-mono text-sm">No active operations queued.</p>
            ) : (
              <ul className="space-y-4">
                {upcomingTasks.map(task => (
                  <li key={task.id} className="flex flex-col gap-1 border-b border-[#00f3ff]/10 pb-3 last:border-0">
                    <div className="flex justify-between items-start">
                      <Link href={`/dashboard/tasks/${task.id}`} className="font-semibold text-white hover:text-pink-500 transition-colors">
                        {task.title}
                      </Link>
                      <span className="text-[10px] font-mono px-2 py-0.5 border border-pink-500 text-pink-500">{task.status}</span>
                    </div>
                    {task.dueDate && (
                      <span className="text-xs text-cyan-700 font-mono">T-MINUS: {formatDateTime(task.dueDate)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="ghost" className="w-full mt-4 text-[#00f3ff] hover:text-[#ff00ff] hover:bg-transparent font-mono tracking-wider">
              <Link href="/dashboard/tasks">VIEW_ALL_OPS <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card className="border-[#00ff00] bg-[#0d0d0d] shadow-[0_0_10px_#00ff00_inset] col-span-1 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#00ff00]/20 pb-4">
            <CardTitle className="text-lg font-bold tracking-widest text-[#00ff00] uppercase flex items-center gap-2">
              <Terminal className="h-5 w-5 text-[#fcee0a]" />
              Completed Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {completedTasks.length === 0 ? (
              <p className="text-gray-500 font-mono text-sm">Awaiting first successful operation.</p>
            ) : (
              <ul className="space-y-4">
                {completedTasks.map(task => (
                  <li key={task.id} className="flex flex-col gap-1 border-b border-[#00ff00]/10 pb-3 last:border-0 opacity-70">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-300 line-through decoration-[#00ff00]">{task.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 border border-[#00ff00] text-[#00ff00]">{task.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-[#fcee0a] bg-[#0d0d0d] shadow-[0_0_10px_#fcee0a_inset] col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#fcee0a]/20 pb-4">
            <CardTitle className="text-lg font-bold tracking-widest text-[#fcee0a] uppercase flex items-center gap-2">
              <Activity className="h-5 w-5 text-pink-500" />
              Network Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {logs.length === 0 ? (
              <p className="text-gray-500 font-mono text-sm">No recent network activity detected.</p>
            ) : (
              <ul className="space-y-4">
                {logs.slice(0, 10).map(log => (
                  <li key={log.id} className="flex flex-col border-l-2 border-[#fcee0a] pl-3">
                    <p className="text-sm font-medium text-white">
                      {log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email : 'System'}{' '}
                      <span className="text-[#00f3ff]">{log.action.replace(/_/g, ' ')}</span>
                    </p>
                    <span className="text-xs text-gray-500 font-mono mt-1">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="ghost" className="w-full mt-4 text-[#fcee0a] hover:text-black hover:bg-[#fcee0a] font-mono tracking-wider">
              <Link href="/dashboard/activity">FULL_DIAGNOSTICS <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
