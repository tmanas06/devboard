'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Comment } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CommentListProps {
    comments: Comment[];
    currentUserId: string;
    onDelete: (id: string) => void;
}

export function CommentList({ comments, currentUserId, onDelete }: CommentListProps) {
    if (comments.length === 0) {
        return (
            <div className="text-center py-16 bg-white dark:bg-gray-800/10 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
                    <Trash2 className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-400 dark:text-gray-500 font-medium italic">No comments yet. Start the conversation!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {comments.map((comment, index) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    isAuthor={comment.author.id === currentUserId}
                    onDelete={() => onDelete(comment.id)}
                    index={index}
                />
            ))}
        </div>
    );
}

function CommentItem({
    comment,
    isAuthor,
    onDelete,
    index
}: {
    comment: Comment;
    isAuthor: boolean;
    onDelete: () => void;
    index: number;
}) {
    const relativeTime = useRelativeTime(comment.createdAt);
    const initials = comment.author.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const colors = [
        'bg-blue-500',
        'bg-purple-500',
        'bg-indigo-500',
        'bg-emerald-500',
        'bg-amber-500',
        'bg-rose-500',
    ];
    const bgColor = colors[comment.author.id.charCodeAt(0) % colors.length];

    const handleDelete = () => {
        if (window.confirm('Delete this comment?')) {
            onDelete();
        }
    };

    return (
        <div
            className="flex gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-lg transition-transform group-hover:scale-110",
                bgColor,
                "shadow-lg ring-4 ring-white dark:ring-gray-900"
            )}>
                {initials}
            </div>
            <div className="flex-1 min-w-0 bg-white dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-500/20 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{comment.author.name}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{relativeTime}</span>
                    </div>
                    {isAuthor && (
                        <button
                            onClick={handleDelete}
                            className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-all p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
                            aria-label="Delete comment"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words text-sm leading-relaxed font-medium">
                    {comment.body}
                </p>
            </div>
        </div>
    );
}

function useRelativeTime(dateStr: string) {
    const [relativeTime, setRelativeTime] = useState('');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const date = new Date(dateStr);
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return setRelativeTime('just now');

            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) return setRelativeTime(`${diffInMinutes}m ago`);

            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return setRelativeTime(`${diffInHours}h ago`);

            const diffInDays = Math.floor(diffInHours / 24);
            setRelativeTime(`${diffInDays}d ago`);
        };

        update();
        const interval = setInterval(update, 30000);
        return () => clearInterval(interval);
    }, [dateStr]);

    return relativeTime;
}
