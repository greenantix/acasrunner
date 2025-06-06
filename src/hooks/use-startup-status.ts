import { useState, useEffect, useCallback } from 'react';

export interface StartupStatus {
  initialized: boolean;
  services: {
    database_migrations: boolean;
    vector_storage: boolean;
    configuration: boolean;
  };
  errors: string[];
  timestamp: string;
}

export interface StartupHookState {
  status: StartupStatus | null;
  loading: boolean;
  error: string | null;
}

export function useStartupStatus() {
  const [state, setState] = useState<StartupHookState>({
    status: null,
    loading: true,
    error: null
  });

  const fetchStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/startup');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setState({
        status: data,
        loading: false,
        error: null
      });
    } catch (error) {
      setState({
        status: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/startup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'initialize' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setState({
        status: data,
        loading: false,
        error: null
      });
      
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const reinitialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/startup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reinitialize' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setState({
        status: data,
        loading: false,
        error: null
      });
      
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const healthCheck = useCallback(async () => {
    try {
      const response = await fetch('/api/startup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'health_check' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }, []);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return {
    ...state,
    fetchStatus,
    initialize,
    reinitialize,
    healthCheck,
    isInitialized: state.status?.initialized ?? false,
    hasErrors: (state.status?.errors.length ?? 0) > 0,
    allServicesRunning: state.status ? Object.values(state.status.services).every(Boolean) : false
  };
}
