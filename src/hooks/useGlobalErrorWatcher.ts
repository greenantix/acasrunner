// src/hooks/useGlobalErrorWatcher.ts
"use client";

import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import ErrorDisplayToast from '@/components/error-display-toast';
import type React from 'react';

export function useGlobalErrorWatcher() {
  useEffect(() => {
    const handleGlobalError = (
      message: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      console.error("Global error caught by window.onerror:", message, source, lineno, colno, error);
      const errorInstance = error || new Error(typeof message === 'string' ? message : 'Unknown global error');
      
      toast({
        title: "Unhandled Error Detected",
        description: React.createElement(ErrorDisplayToast, { 
          error: errorInstance, 
          errorInfo: { componentStack: `Global error at ${source}:${lineno}:${colno}` },
          source: 'window.onerror'
        }),
        variant: "destructive",
        duration: Infinity,
      });
      return true; // Prevents the default browser error handling
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      const errorInstance = event.reason instanceof Error ? event.reason : new Error(String(event.reason) || 'Unhandled promise rejection');
      
      toast({
        title: "Unhandled Promise Rejection",
        description: React.createElement(ErrorDisplayToast, { 
          error: errorInstance,
          errorInfo: { componentStack: `Promise rejection. Reason: ${String(event.reason)}` },
          source: 'unhandledrejection'
        }),
        variant: "destructive",
        duration: Infinity,
      });
    };

    window.onerror = handleGlobalError;
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.onerror = null;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}
