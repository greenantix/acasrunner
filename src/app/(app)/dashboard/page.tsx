'use client';

import { ActivityStream } from '@/components/activity-stream';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { activityService } from '@/services/client-activity-service';
import { useEffect } from 'react';

export default function DashboardPage() {
  useEffect(() => {
    // Log that the dashboard was opened
    activityService.logUserAction('Dashboard page opened');

    // Add some demo file events for testing
    const addDemoEvents = () => {
      setTimeout(() => {
        activityService.addActivity({
          id: `demo_${Date.now()}`,
          timestamp: new Date(),
          type: 'file_change',
          source: 'src/components/Button.tsx',
          message: 'File modified: Button.tsx',
          details: {
            filePath: 'src/components/Button.tsx',
            changeType: 'modified',
            severity: 'medium',
          },
        });
      }, 2000);

      setTimeout(() => {
        activityService.addActivity({
          id: `demo_${Date.now()}`,
          timestamp: new Date(),
          type: 'system_event',
          source: 'activity-monitor',
          message: 'File watcher detected 3 new changes in the last minute',
          details: {
            severity: 'low',
          },
        });
      }, 4000);
    };

    addDemoEvents();
  }, []);
  return (
    <div className="space-y-6" suppressHydrationWarning>
      <h1 className="font-headline text-3xl font-semibold">Activity Monitor</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Real-time Developer Activity</CardTitle>
          <CardDescription>
            Monitoring file changes, errors, and system events across your workspace in real-time.
            <br />
            <span className="text-xs text-muted-foreground">
              ✅ Client-side error monitoring active • 📡 Server stream connected • 🔍 File watching
              ready
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityStream
            maxHeight="calc(100vh - 20rem)"
            showHeader={true}
            showFilters={true}
            autoScroll={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
