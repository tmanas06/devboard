'use client';

import { useState } from 'react';
import { Comment } from '@/lib/types';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { createComment, deleteComment } from '@/lib/api';
import { X } from 'lucide-react';

interface CommentSectionProps {
    taskId: string;
    currentUserId: string;
    currentUser: {
        name: string;
        email: string;
    };
    initialComments: Comment[];
}

export function CommentSection({ taskId, currentUserId, currentUser, initialComments }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (body: string) => {
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticComment: Comment = {
            id: optimisticId,
            body,
            createdAt: new Date().toISOString(),
            author: {
                id: currentUserId,
                name: currentUser.name,
                email: currentUser.email,
            },
        };

        setComments((prev) => [optimisticComment, ...prev]);
        setSubmitting(true);
        setError(null);

        try {
            const realComment = await createComment(taskId, body);
            setComments((prev) => prev.map((c) => (c.id === optimisticId ? realComment : c)));
        } catch (err: any) {
            console.error('Failed to post comment:', err);
            setComments((prev) => prev.filter((c) => c.id !== optimisticId));
            setError(err.message || 'Failed to post comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const backup = [...comments];
        setComments((prev) => prev.filter((c) => c.id !== id));
        setError(null);

        try {
            await deleteComment(id);
        } catch (err: any) {
            console.error('Failed to delete comment:', err);
            setComments(backup);
            setError(err.message || 'Failed to delete comment. Please try again.');
        }
    };

    return (
        <div className="space-y-10">
            {error && (
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 font-medium">
                        <span>⚠ Oops! {error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800/10 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-1">
                <CommentForm onSubmit={handleSubmit} submitting={submitting} />
            </div>

            <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-100 to-transparent dark:from-gray-800 dark:to-transparent -z-10" />
                <CommentList
                    comments={comments}
                    currentUserId={currentUserId}
                    onDelete={handleDelete}
                />
            </div>
        </div>
    );
}
