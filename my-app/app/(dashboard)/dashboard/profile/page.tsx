'use client';

import { ProfileForm } from './profile-form';
import { fetchCurrentUser } from '@/lib/api';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProfileFormSkeleton } from '@/components/skeletons';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/nextjs';

export default function ProfilePage() {
    const { getToken } = useAuth();
    const { user: clerkUser } = useUser();

    const { data: user, isLoading, error, refetch } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const token = await getToken();
            return fetchCurrentUser(token);
        },
        enabled: !!clerkUser, // Only fetch once Clerk is ready
        retry: 2,
    });

    // Show skeleton while Clerk is initializing OR while the query is fetching
    if (!clerkUser || isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your account settings and profile information.
                    </p>
                </div>
                <ProfileFormSkeleton />
            </div>
        );
    }

    if (!user || error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your account settings and profile information.
                    </p>
                </div>
                <Card className="w-full max-w-2xl">
                    <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                        <AlertCircle className="h-10 w-10 text-red-400" />
                        <p className="text-gray-500">Failed to load profile. Please ensure you are logged in.</p>
                        <Button variant="outline" onClick={() => refetch()} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and profile information.
                </p>
            </div>
            <ProfileForm initialData={user} />
        </div>
    );
}
