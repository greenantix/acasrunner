'use client';

import { useState, useEffect, useCallback } from 'react';
import { firebaseActivityService, FirebaseActivityEvent } from '@/lib/firebase/activity-service';

export interface UseFirebaseActivitiesOptions {
  limit?: number;
  userId?: string;
  sessionId?: string;
  types?: string[];
  severity?: string[];
  autoSync?: boolean;
  minutesBack?: number;
}

export interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: number;
}

export function useFirebaseActivities(options: UseFirebaseActivitiesOptions = {}) {
  const [activities, setActivities] = useState<FirebaseActivityEvent[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    byType: {},
    bySeverity: {},
    recentErrors: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time activities
  useEffect(() => {
    if (!options.autoSync) return;

    setLoading(true);
    setError(null);

    let unsubscribeActivities: (() => void) | null = null;
    let unsubscribeStats: (() => void) | null = null;

    try {
      // Subscribe to activities
      if (options.minutesBack) {
        unsubscribeActivities = firebaseActivityService.subscribeToRecentActivities(
          (newActivities) => {
            setActivities(newActivities);
            setLoading(false);
          },
          options.minutesBack
        );
      } else {
        unsubscribeActivities = firebaseActivityService.subscribeToActivities(
          (newActivities) => {
            setActivities(newActivities);
            setLoading(false);
          },
          options
        );
      }

      // Subscribe to stats
      unsubscribeStats = firebaseActivityService.subscribeToActivityStats(
        (newStats) => {
          setStats(newStats);
        },
        options.minutesBack || 60
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Firebase');
      setLoading(false);
    }

    return () => {
      if (unsubscribeActivities) unsubscribeActivities();
      if (unsubscribeStats) unsubscribeStats();
    };
  }, [
    options.autoSync,
    options.limit,
    options.userId,
    options.sessionId,
    options.minutesBack,
    JSON.stringify(options.types),
    JSON.stringify(options.severity)
  ]);

  // Add new activity
  const addActivity = useCallback(async (activity: Omit<FirebaseActivityEvent, 'id'>) => {
    try {
      const id = await firebaseActivityService.addActivity(activity);
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add activity');
      throw err;
    }
  }, []);

  // Update activity
  const updateActivity = useCallback(async (id: string, updates: Partial<FirebaseActivityEvent>) => {
    try {
      await firebaseActivityService.updateActivity(id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update activity');
      throw err;
    }
  }, []);

  // Delete activity
  const deleteActivity = useCallback(async (id: string) => {
    try {
      await firebaseActivityService.deleteActivity(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity');
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Manually refresh data
  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    // The subscriptions will automatically update the data
  }, []);

  return {
    activities,
    stats,
    loading,
    error,
    addActivity,
    updateActivity,
    deleteActivity,
    clearError,
    refresh,
    isConnected: !error && !loading
  };
}

// Hook for real-time activity stats only
export function useActivityStats(timeWindowMinutes: number = 60) {
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    byType: {},
    bySeverity: {},
    recentErrors: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = firebaseActivityService.subscribeToActivityStats(
      (newStats) => {
        setStats(newStats);
        setLoading(false);
      },
      timeWindowMinutes
    );

    return unsubscribe;
  }, [timeWindowMinutes]);

  return { stats, loading, error };
}

// Hook for adding activities (useful for forms/actions)
export function useAddActivity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addActivity = useCallback(async (activity: Omit<FirebaseActivityEvent, 'id'>) => {
    setLoading(true);
    setError(null);

    try {
      const id = await firebaseActivityService.addActivity(activity);
      setLoading(false);
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add activity';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    addActivity,
    loading,
    error,
    clearError
  };
}