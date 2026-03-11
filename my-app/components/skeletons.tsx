import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function StatCardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-16" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <Skeleton className="h-5 w-12" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {/* Header row */}
                    <div className="flex gap-4 pb-2 border-b">
                        {Array.from({ length: cols }).map((_, i) => (
                            <Skeleton key={i} className="h-4 flex-1" />
                        ))}
                    </div>
                    {/* Data rows */}
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="flex gap-4 py-2">
                            {Array.from({ length: cols }).map((_, j) => (
                                <Skeleton key={j} className="h-4 flex-1" />
                            ))}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export function RecentEntriesSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-60" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-12" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export function ProfileFormSkeleton() {
    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-72 mt-1" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-6 pb-8 border-b">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-36" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-28" />
            </CardContent>
        </Card>
    );
}
