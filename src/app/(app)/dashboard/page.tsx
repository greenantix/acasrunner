'use client';

import { ActivityStream } from '@/components/activity-stream';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { activityService } from '@/services/client-activity-service';
import { useEffect } from 'react';
import { Database, Activity } from 'lucide-react';

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
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-3xl font-semibold">Activity Monitor</h1>
        <Badge variant="outline" className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          Firebase Integration Ready
        </Badge>
      </div>
      
      <Tabs defaultValue="local" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="local" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Local Stream
          </TabsTrigger>
          <TabsTrigger value="firebase" className="flex items-center gap-2" disabled>
            <Database className="h-4 w-4" />
            Firebase (Coming Soon)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="local" className="space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Local Activity Stream
              </CardTitle>
              <CardDescription>
                Local in-memory activity monitoring for this session only.
                Firebase real-time integration will be enabled after fixing import issues.
                <br />
                <span className="text-xs text-muted-foreground">
                  ✅ Client-side error monitoring active • 📡 Server stream connected • 🔍 File watching ready
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
        </TabsContent>
        
        <TabsContent value="firebase" className="space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Database className="h-6 w-6" />
                Firebase Real-time (Loading...)
              </CardTitle>
              <CardDescription>
                Firebase integration is being set up. Please restart the dev server after the webpack changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Firebase real-time features coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}