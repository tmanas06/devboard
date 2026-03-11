'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Building2, Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { CardGridSkeleton } from '@/components/skeletons';

interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    members: number;
    tasks: number;
    timeEntries: number;
  };
}

const organizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  }),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export default function ManageOrganizationsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState('');
  const canCreate = !!user;
  const { toast: showToast } = useToast();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
  });

  const { data: organizations, isLoading, isError: isOrgError, refetch: refetchOrgs } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const token = await getToken();
      const response = await api.get('/organizations', {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      return response.data;
    },
    enabled: !!user,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const token = await getToken();
      const response = await api.get('/users/me', {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      return response.data as {
        id: string;
        organizations: Array<{ id: string; name: string; slug: string; role: 'ORG_ADMIN' | 'MEMBER' }>;
      };
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const token = await getToken();
      return api.post(
        '/organizations',
        data,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setIsCreateOpen(false);
      form.reset();
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create organization');
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const token = await getToken();
      return api.post(
        '/users/join-organization',
        { organizationId },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
    onError: () => {
      showToast({ variant: 'destructive', title: 'Failed to join organization', description: 'Please try again.' });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const token = await getToken();
      return api.post(
        '/users/leave-organization',
        { organizationId },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
    onError: () => {
      showToast({ variant: 'destructive', title: 'Failed to leave organization', description: 'Please try again.' });
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const onSubmit = (data: OrganizationFormData) => {
    setError('');
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#ff00ff]/20 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-[#ff00ff] uppercase">Network Nodes</h1>
          <p className="text-cyan-500 font-mono tracking-widest mt-1 text-sm">// ORG_MANAGEMENT.EXE</p>
        </div>
        {canCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00f3ff] text-black hover:bg-white glow-secondary font-mono tracking-wider">
                <Plus className="mr-2 h-4 w-4" />
                Initialize Node
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Acme Corporation"
                    onChange={(e) => {
                      form.setValue('name', e.target.value);
                      if (!form.getValues('slug')) {
                        form.setValue('slug', generateSlug(e.target.value));
                      }
                    }}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Organization Slug</Label>
                  <Input
                    id="slug"
                    {...form.register('slug')}
                    placeholder="acme-corp"
                    pattern="[a-z0-9-]+"
                  />
                  {form.formState.errors.slug && (
                    <p className="text-sm text-red-500">{form.formState.errors.slug.message}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Lowercase letters, numbers, and hyphens only. This will be used in URLs.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      form.reset();
                      setError('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : isOrgError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-gray-500">Failed to load organizations.</p>
            <Button variant="outline" onClick={() => refetchOrgs()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : organizations && organizations.length > 0 ? (
        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-xl font-bold tracking-widest text-[#00f3ff] uppercase font-mono">Connected Nodes</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations
                .filter((o) => currentUser?.organizations?.some((m) => m.id === o.id))
                .map((org) => (
                  <Card key={org.id} className="bg-[#0a0a0a] border-[#00f3ff] hover:glow-secondary transition-all">
                    <CardHeader className="border-b border-[#00f3ff]/20">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#ff00ff]" />
                        <CardTitle className="text-[#00f3ff]">{org.name}</CardTitle>
                      </div>
                      <CardDescription className="text-cyan-700 font-mono">ID: {org.slug}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Members:</span>
                          <span className="font-medium">{org._count.members}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tasks:</span>
                          <span className="font-medium">{org._count.tasks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time Entries:</span>
                          <span className="font-medium">{org._count.timeEntries}</span>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <Link href={`/dashboard/organizations/${org.id}`} className="flex-1">
                            <Button variant="outline" className="w-full border-[#00f3ff] text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black">
                              View Node
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => leaveMutation.mutate(org.id)}
                            disabled={leaveMutation.isPending}
                          >
                            {leaveMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Leaving...
                              </>
                            ) : (
                              'Disconnect'
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          <div className="space-y-3 mt-8">
            <h2 className="text-xl font-bold tracking-widest text-[#fcee0a] uppercase font-mono">Available Networks</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => {
                const isMember = !!currentUser?.organizations?.some((m) => m.id === org.id);
                return (
                  <Card key={org.id} className="bg-[#0a0a0a] border-[#fcee0a] opacity-80 hover:opacity-100 transition-opacity">
                    <CardHeader className="border-b border-[#fcee0a]/20">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#ff00ff]" />
                        <CardTitle className="text-[#fcee0a]">{org.name}</CardTitle>
                      </div>
                      <CardDescription className="text-yellow-700 font-mono">ID: {org.slug}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Members:</span>
                          <span className="font-medium">{org._count.members}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tasks:</span>
                          <span className="font-medium">{org._count.tasks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time Entries:</span>
                          <span className="font-medium">{org._count.timeEntries}</span>
                        </div>
                        <div className="pt-2">
                          {isMember ? (
                            <Button variant="secondary" disabled>
                              You are a member
                            </Button>
                          ) : (
                            <Button
                              onClick={() => joinMutation.mutate(org.id)}
                              disabled={joinMutation.isPending}
                            >
                              {joinMutation.isPending && joinMutation.variables === org.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Joining...
                                </>
                              ) : (
                                'Join Organization'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Card className="bg-[#0a0a0a] border-[#ff0033]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="mb-4 h-12 w-12 text-[#ff0033]" />
            <p className="text-[#ff0033] font-mono tracking-widest uppercase">No networks located. Initialize a new node.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

