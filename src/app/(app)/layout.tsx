// src/app/(app)/layout.tsx
"use client"; // Required for hooks like useGlobalErrorWatcher

import { AppShell } from '@/components/layout/app-shell';
import GlobalErrorBoundary from '@/components/error-boundary-global';
import { useGlobalErrorWatcher } from '@/hooks/useGlobalErrorWatcher';
import type React from 'react';

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize the global error watcher
  // This hook will set up window.onerror and window.onunhandledrejection
  useGlobalErrorWatcher();

  return (
    <GlobalErrorBoundary>
      <AppShell>{children}</AppShell>
    </GlobalErrorBoundary>
  );
}

