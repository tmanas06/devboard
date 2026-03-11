'use client';

import { use, useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Save, Loader2, Users, Settings, Activity, ArrowLeft, Shield, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useOrg } from '@/contexts/org-context';
import { CardGridSkeleton } from '@/components/skeletons';
import { formatDate } from '@/lib/utils';
import type { User as UserType } from '@/lib/types';

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

const updateOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  }),
});

type UpdateOrgFormData = z.infer<typeof updateOrgSchema>;

export default function OrganizationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  // Optional: check if rawId is slug or id. We assume ID based on the route.
  const organizationId = rawId;

  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const { userRole, selectedOrgId } = useOrg();

  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  const form = useForm<UpdateOrgFormData>({
    resolver: zodResolver(updateOrgSchema),
    defaultValues: { name: '', slug: '' }
  });

  const { data: organization, isLoading: orgLoading, isError: orgError } = useQuery<Organization>({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      const token = await getToken();
      const response = await api.get(`/organizations/${organizationId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      return response.data;
    },
    enabled: !!user,
  });

  const { data: members, isLoading: membersLoading } = useQuery<UserType[]>({
    queryKey: ['users', organizationId],
    queryFn: async () => {
      const token = await getToken();
      // Temporarily switch header for this specific query to fetch specific org members if possible
      const response = await api.get(`/users?organizationId=${organizationId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      return response.data;
    },
    enabled: !!user && activeTab === 'members',
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        slug: organization.slug,
      });
    }
  }, [organization, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateOrgFormData) => {
      const token = await getToken();
      return api.patch(`/organizations/${organizationId}`, data, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
    },
    onSuccess: (res) => {
      toast({ title: 'Organization Updated', description: 'Network node parameters successfully refreshed.' });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update organization parameters.');
    },
  });

  const onSubmit = (data: UpdateOrgFormData) => {
    setError('');
    updateMutation.mutate(data);
  };

  const isCurrentOrgAdmins = userRole === 'ORG_ADMIN' && selectedOrgId === organizationId;
  const isGlobalAdmin = userRole === 'ADMIN';
  const canEdit = isCurrentOrgAdmins || isGlobalAdmin;

  if (orgError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Building2 className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold font-mono tracking-widest text-red-500 uppercase">Node Access Denied</h2>
        <p className="text-gray-500">You do not have access to this organization or it does not exist.</p>
        <Link href="/dashboard/organizations">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Nodes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-[#00f3ff]/20 pb-4">
        <Link href="/dashboard/organizations">
          <Button variant="ghost" size="icon" className="hover:text-[#00f3ff] hover:bg-[#00f3ff]/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-[#00f3ff] uppercase flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {orgLoading ? 'Loading Node...' : organization?.name}
          </h1>
          <p className="text-gray-500 font-mono tracking-widest mt-1 text-sm">
            // NODE_INSPECTION.EXE - {organization?.slug || 'SEARCHING'}
          </p>
        </div>
      </div>

      {orgLoading ? (
        <CardGridSkeleton count={2} />
      ) : organization && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#0a0a0a] border border-[#00f3ff]/20 p-1">
            <TabsTrigger value="overview" className="font-mono tracking-wider data-[state=active]:bg-[#00f3ff] data-[state=active]:text-black">
              <Activity className="mr-2 h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="members" className="font-mono tracking-wider data-[state=active]:bg-[#00f3ff] data-[state=active]:text-black">
              <Users className="mr-2 h-4 w-4" /> Personnel
            </TabsTrigger>
            {canEdit && (
              <TabsTrigger value="settings" className="font-mono tracking-wider data-[state=active]:bg-[#00f3ff] data-[state=active]:text-black">
                <Settings className="mr-2 h-4 w-4" /> Config
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="bg-[#0a0a0a] border-[#00f3ff]/30 shadow-[0_0_10px_rgba(0,243,255,0.1)]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 font-mono tracking-wider uppercase">Active Personnel</CardTitle>
                  <Users className="h-4 w-4 text-[#ff00ff]" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#fcee0a]">{organization._count.members}</div>
                </CardContent>
              </Card>

              <Card className="bg-[#0a0a0a] border-[#00f3ff]/30 shadow-[0_0_10px_rgba(0,243,255,0.1)]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 font-mono tracking-wider uppercase">Assigned Tasks</CardTitle>
                  <Activity className="h-4 w-4 text-[#ff00ff]" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#00f3ff]">{organization._count.tasks}</div>
                </CardContent>
              </Card>

              <Card className="bg-[#0a0a0a] border-[#00f3ff]/30 shadow-[0_0_10px_rgba(0,243,255,0.1)]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 font-mono tracking-wider uppercase">Logged Cycles</CardTitle>
                  <Clock className="h-4 w-4 text-[#ff00ff]" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#ff00ff]">{organization._count.timeEntries}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#0a0a0a] border-[#00f3ff]/20">
              <CardHeader>
                <CardTitle className="text-[#00f3ff] uppercase tracking-widest font-mono text-lg">Node Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm font-mono text-gray-300">
                <div className="grid grid-cols-2 gap-4 border-b border-[#00f3ff]/10 py-3">
                  <span className="text-gray-500 uppercase">Status</span>
                  <Badge variant="outline" className="w-fit text-green-400 border-green-400 bg-green-400/10">ACTIVE</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 border-b border-[#00f3ff]/10 py-3">
                  <span className="text-gray-500 uppercase">Creation Cipher</span>
                  <span>{formatDate(organization.createdAt)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-3">
                  <span className="text-gray-500 uppercase">Node ID</span>
                  <span>{organization.id}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card className="bg-[#0a0a0a] border-[#00f3ff]/20">
              <CardHeader>
                <CardTitle className="text-[#00f3ff] uppercase tracking-widest font-mono text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" /> Authorized Entities
                </CardTitle>
                <CardDescription className="text-gray-500 font-mono">List of users connected to this node.</CardDescription>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-[#ff00ff]" /></div>
                ) : members && members.length > 0 ? (
                  <div className="space-y-4">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-md bg-[#0d0d0d] border border-gray-800 hover:border-[#00f3ff]/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-[#1a1a1a] border border-[#ff00ff]/30 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-200">{member.firstName} {member.lastName}</p>
                            <p className="text-sm text-gray-500 font-mono">{member.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`font-mono uppercase tracking-wider ${member.role === 'ORG_ADMIN' ? 'border-[#ff00ff] text-[#ff00ff]' : 'border-[#00f3ff] text-[#00f3ff]'}`}>
                          <Shield className="mr-2 h-3 w-3" />
                          {member.role?.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8 font-mono uppercase">No entities found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canEdit && (
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-[#0a0a0a] border-[#ff00ff]/20 shadow-[0_0_15px_rgba(255,0,255,0.05)]">
                <CardHeader>
                  <CardTitle className="text-[#ff00ff] uppercase tracking-widest font-mono text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" /> Core Configuration
                  </CardTitle>
                  <CardDescription className="text-gray-500 font-mono">Update the primary parameters for this network node.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {error && (
                      <Alert variant="destructive" className="bg-red-500/10 border-red-500">
                        <AlertDescription className="text-red-400 font-mono">{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-300 font-mono uppercase">Node Identifier (Name)</Label>
                      <Input
                        id="name"
                        className="bg-[#0d0d0d] border-gray-700 focus-visible:ring-[#ff00ff] font-mono text-gray-200"
                        {...form.register('name')}
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-400 font-mono">{form.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug" className="text-gray-300 font-mono uppercase">Network Slug</Label>
                      <Input
                        id="slug"
                        className="bg-[#0d0d0d] border-gray-700 focus-visible:ring-[#00f3ff] font-mono text-gray-200"
                        {...form.register('slug')}
                        pattern="[a-z0-9-]+"
                      />
                      {form.formState.errors.slug && (
                        <p className="text-sm text-red-400 font-mono">{form.formState.errors.slug.message}</p>
                      )}
                      <p className="text-xs text-gray-500 font-mono">
                        // CAUTION: CHANGING SLUG MAY AFFECT ROUTING VECTORS
                      </p>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-800">
                      <Button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty} className="bg-[#ff00ff] hover:bg-[#ff00ff]/80 text-black font-mono tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(255,0,255,0.5)]">
                        {updateMutation.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Patching...</>
                        ) : (
                          <><Save className="mr-2 h-4 w-4" /> Commit Changes</>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </Tabs>
      )}
    </div>
  );
}
