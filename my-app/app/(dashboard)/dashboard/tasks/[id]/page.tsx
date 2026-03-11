import { Suspense } from 'react';
import { createServerApiClient } from '@/lib/api-server';
import { CommentSection } from '@/components/comments/CommentSection';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, ArrowLeft, X } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TaskDependencies } from '@/components/tasks/TaskDependencies';

// This is a Server Component
export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const serverApi = await createServerApiClient();

        const [taskRes, commentsRes, userRes] = await Promise.all([
            serverApi.get(`/tasks/${id}`),
            serverApi.get(`/tasks/${id}/comments`),
            serverApi.get('/users/me')
        ]);

        const task = taskRes.data;
        const initialComments = commentsRes.data;
        const currentUser = userRes.data;

        const initials = `${(currentUser.firstName || '')[0] || ''}${(currentUser.lastName || '')[0] || ''}`.toUpperCase() || '?';

        return (
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
                <div className="mb-6">
                    <Link href="/dashboard/tasks">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white -ml-2 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Tasks
                        </Button>
                    </Link>
                </div>

                <div className="space-y-8">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start justify-between gap-4">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{task.title}</h1>
                            <Badge className={priorityColors[task.priority]}>
                                {task.priority}
                            </Badge>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700/50 shadow-sm">
                                <Badge className={cn("px-1 py-0 h-4 text-[10px]", statusColors[task.status])}>
                                    {task.status.replace('_', ' ')}
                                </Badge>
                            </div>
                            {task.estimatedHours && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700/50 shadow-sm font-medium text-gray-600 dark:text-gray-300">
                                    <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                    {task.estimatedHours}h estimated
                                </div>
                            )}
                            {task.dueDate && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700/50 shadow-sm font-medium text-orange-600 dark:text-orange-400">
                                    <Calendar className="w-4 h-4" />
                                    Due {formatDate(task.dueDate)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800/30 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-sm">
                        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Description</h2>
                        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {task.description || 'No description provided.'}
                        </div>
                    </div>

                    {task.assignedTo && task.assignedTo.length > 0 && (
                        <div className="bg-white dark:bg-gray-800/30 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-sm">
                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">Assigned To</h2>
                            <div className="flex flex-wrap gap-4">
                                {task.assignedTo.map((user: any) => (
                                    <div key={user.id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/50 group hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                                        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-400/20 group-hover:scale-105 transition-transform">
                                            {`${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">{user.firstName} {user.lastName}</span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{user.email}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <TaskDependencies
                        taskId={task.id}
                        organizationId={task.organizationId}
                        blockedBy={task.blockedBy}
                        blocks={task.blocks}
                    />

                    <section className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-10">
                            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                                Comments
                            </h2>
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 dark:border-gray-700/50">
                                {initialComments.length}
                            </span>
                        </div>
                        <CommentSection
                            taskId={task.id}
                            currentUserId={currentUser.id}
                            currentUser={{
                                name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
                                email: currentUser.email
                            }}
                            initialComments={initialComments}
                        />
                    </section>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Failed to load task details:', error);
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
                    <X className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Task not found</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">The task you're looking for doesn't exist or you don't have access to it.</p>
                <Link href="/dashboard/tasks">
                    <Button className="px-8">Back to Tasks</Button>
                </Link>
            </div>
        );
    }
}

const statusColors: Record<string, string> = {
    OPEN: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-400/20',
    TODO: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-400/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/20',
    IN_REVIEW: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-400/20',
    DONE: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-400/20',
    CLOSED: 'bg-gray-500/10 text-gray-500 dark:text-gray-500 border-gray-500/20',
};

const priorityColors: Record<string, string> = {
    LOW: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-400/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-400/20',
    HIGH: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-400/20',
    URGENT: 'bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20',
};
