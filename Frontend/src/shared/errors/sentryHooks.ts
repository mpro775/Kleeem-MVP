// src/shared/errors/sentryHooks.ts
import { useContext } from 'react';
import { SentryContext } from './SentryProvider';

export function useSentry() {
  const context = useContext(SentryContext);
  if (!context) {
    throw new Error('useSentry must be used within a SentryProvider');
  }
  return context;
}
