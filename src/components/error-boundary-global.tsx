// src/components/error-boundary-global.tsx
"use client";

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';
import ErrorDisplayToast from '@/components/error-display-toast'; // We'll create this next

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });

    // Trigger a toast with the custom error display component
    toast({
      title: "Application Error Occurred",
      description: React.createElement(ErrorDisplayToast, { 
        error, 
        errorInfo,
        source: 'ErrorBoundary' 
      }),
      variant: "destructive",
      duration: Infinity, // Keep it open until manually dismissed or action taken
    });
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI here
      // For now, we let the toast handle the display and render children to allow app to continue if possible
      // Or, to be safer for critical errors:
      // return (
      //   <div className="p-4 text-center">
      //     <h1 className="text-2xl font-bold text-destructive">Something went wrong.</h1>
      //     <p className="text-muted-foreground">An error was caught by the application boundary.</p>
      //     <p className="text-sm mt-2">{this.state.error?.message}</p>
      //   </div>
      // );
    }
    return this.props.children;
  }
}

export default GlobalErrorBoundary;
