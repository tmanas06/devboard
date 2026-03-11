'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const ORG_STORAGE_KEY = 'devboard-selected-org';

export interface UserOrg {
    id: string;
    name: string;
    slug: string;
    role: 'ADMIN' | 'ORG_ADMIN' | 'MEMBER';
}

interface OrgContextValue {
    /** Currently selected organization ID */
    selectedOrgId: string | null;
    /** Full object of the currently selected organization */
    selectedOrg: UserOrg | null;
    /** All organizations the user belongs to */
    userOrgs: UserOrg[];
    /** User's role in the currently selected organization */
    userRole: 'ADMIN' | 'ORG_ADMIN' | 'MEMBER' | null;
    /** Switch to a different organization */
    switchOrg: (orgId: string) => void;
    /** Create a new organization */
    createOrg: (data: { name: string; slug: string }) => Promise<void>;
    /** Whether the context is still loading */
    isLoading: boolean;
}

const OrgContext = createContext<OrgContextValue>({
    selectedOrgId: null,
    selectedOrg: null,
    userOrgs: [],
    userRole: null,
    switchOrg: () => { },
    createOrg: async () => { },
    isLoading: true,
});

export function useOrg() {
    return useContext(OrgContext);
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
    const { getToken } = useAuth();
    const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
    const isE2E = process.env.NEXT_PUBLIC_E2E === 'true' || (typeof window !== 'undefined' && window.localStorage.getItem('devboard-e2e') === 'true');
    const user = isE2E ? { id: 'e2e-user' } : clerkUser;
    const userLoaded = isE2E ? true : clerkLoaded;
    const queryClient = useQueryClient();
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            const val = localStorage.getItem(ORG_STORAGE_KEY);
            if (val === 'null') {
                localStorage.removeItem(ORG_STORAGE_KEY);
                return null;
            }
            return val;
        }
        return null;
    });

    // Fetch the current user's organizations
    const { data: currentUser, isLoading } = useQuery<{
        id: string;
        organizations: UserOrg[];
    }>({
        queryKey: ['current-user'],
        queryFn: async () => {
            const token = await getToken();
            const response = await api.get('/users/me', {
                headers: { Authorization: token ? `Bearer ${token}` : undefined },
            });
            return response.data;
        },
        enabled: userLoaded && !!user,
    });

    const userOrgs = currentUser?.organizations ?? [];

    // Auto-select: if no saved org or saved org isn't valid, pick the first one
    useEffect(() => {
        if (userOrgs.length === 0) return;

        const savedId = selectedOrgId;
        const isValid = savedId && userOrgs.some((o) => o.id === savedId);

        if (!isValid) {
            const firstOrgId = userOrgs[0].id;
            setSelectedOrgId(firstOrgId);
            localStorage.setItem(ORG_STORAGE_KEY, firstOrgId);
        }
    }, [userOrgs, selectedOrgId]);

    const selectedOrg = userOrgs.find((o) => o.id === selectedOrgId) ?? null;
    const userRole = selectedOrg?.role ?? null;

    const switchOrg = useCallback(
        (orgId: string) => {
            if (orgId === selectedOrgId) return;
            setSelectedOrgId(orgId);
            localStorage.setItem(ORG_STORAGE_KEY, orgId);

            // Invalidate all org-dependent queries so they refetch with new context
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['time-entries'] });
            queryClient.invalidateQueries({ queryKey: ['time-summary'] });
            queryClient.invalidateQueries({ queryKey: ['recent-entries'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['time-summary-report'] });
        },
        [selectedOrgId, queryClient],
    );

    const createOrg = useCallback(
        async (data: { name: string; slug: string }) => {
            const token = await getToken();
            const response = await api.post('/organizations', data, {
                headers: { Authorization: token ? `Bearer ${token}` : undefined },
            });
            const newOrg = response.data;
            
            // Invalidate current user to fetch the new organization list
            await queryClient.invalidateQueries({ queryKey: ['current-user'] });
            
            // Switch to the newly created organization
            switchOrg(newOrg.id);
        },
        [getToken, queryClient, switchOrg]
    );

    return (
        <OrgContext.Provider
            value={{
                selectedOrgId,
                selectedOrg,
                userOrgs,
                userRole,
                switchOrg,
                createOrg,
                isLoading: !userLoaded || isLoading,
            }}
        >
            {children}
        </OrgContext.Provider>
    );
}
