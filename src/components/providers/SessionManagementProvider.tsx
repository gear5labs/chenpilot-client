'use client';

import React from 'react';
import { useSessionManagement, useActivityTracking } from '@/hooks/useSessionManagement';
import { useAppSelector } from '@/store';

interface SessionManagementProviderProps {
  children: React.ReactNode;
}

export function SessionManagementProvider({ children }: SessionManagementProviderProps) {
  // Initialize session management
  useSessionManagement();

  // Track user activity and reset inactivity timer
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  useActivityTracking(isAuthenticated);

  return <>{children}</>;
}
