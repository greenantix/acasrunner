'use client';

import { ActivityStream } from '@/components/activity-stream';
import { FirebaseActivityMonitor } from '@/components/firebase/activity-monitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { activityService } from '@/services/client-activity-service';
import { useAddActivity } from '@/hooks/firebase/use-activities';
import { useEffect } from 'react';
import { Database, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { addActivity: addFirebaseActivity } = useAddActivity();

  useEffect(() => {
    // Log that the dashboard was opened
    activityService.logUserAction('Dashboard page opened');

    // Also add to Firebase
    addFirebaseActivity({
      type: 'user_action',
      source: 'dashboard',
      message: 'Dashboard page opened',
      timestamp: new Date(),
      details: {
        severity: 'low',
        environment: 'web'
      }
    }).catch(console.error);

    // Add some demo file events for testing
    const addDemoEvents = () => {
      setTimeout(() => {
        const activity = {
          id: `demo_${Date.now()}`,
          timestamp: new Date(),
          type: 'file_change' as const,
          source: 'src/components/Button.tsx',
          message: 'File modified: Button.tsx',
          details: {
            filePath: 'src/components/Button.tsx',
            changeType: 'modified' as const,
            severity: 'medium' as const,
          },
        };
        
        activityService.addActivity(activity);
        
        // Also add to Firebase
        addFirebaseActivity({
          type: activity.type,
          source: activity.source,
          message: activity.message,
          timestamp: activity.timestamp,
          details: activity.details
        }).catch(console.error);
      }, 2000);

      setTimeout(() => {
        const activity = {
          id: `demo_${Date.now()}`,
          timestamp: new Date(),
          type: 'system_event' as const,
          source: 'activity-monitor',
          message: 'File watcher detected 3 new changes in the last minute',
          details: {
            severity: 'low' as const,
          },
        };
        
        activityService.addActivity(activity);
        
        // Also add to Firebase
        addFirebaseActivity({
          type: activity.type,
          source: activity.source,
          message: activity.message,
          timestamp: activity.timestamp,
          details: activity.details
        }).catch(console.error);
      }, 4000);
    };

    addDemoEvents();
  }, [addFirebaseActivity]);
  
  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-3xl font-semibold">Activity Monitor</h1>
        <Badge variant="outline" className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          Firebase Real-time
        </Badge>
      </div>
      
      <Tabs defaultValue="firebase" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="firebase" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Firebase Real-time
          </TabsTrigger>
          <TabsTrigger value="local" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Local Stream
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="firebase" className="space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Database className="h-6 w-6" />
                Firebase Real-time Activity Monitor
              </CardTitle>
              <CardDescription>
                Real-time activity monitoring with Firebase Firestore synchronization.
                Data is synced across all devices and browser tabs instantly.
                <br />
                <span className="text-xs text-muted-foreground">
                  ✅ Real-time sync • 📊 Cloud storage • 🔄 Cross-device updates • 📈 Analytics
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FirebaseActivityMonitor />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="local" className="space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Local Activity Stream
              </CardTitle>
              <CardDescription>
                Local in-memory activity monitoring for this session only.
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
      </Tabs>
    </div>
  );
}

