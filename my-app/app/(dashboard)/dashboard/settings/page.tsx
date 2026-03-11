'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your workspace settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Manage your organization settings in the Organizations page.
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Go to Dashboard → Organizations to view, join, or leave organizations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
