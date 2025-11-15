// src/shared/errors/hooks.ts
import { useContext } from 'react';
import { ErrorContext } from './GlobalErrorProvider';

export function useGlobalError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
}
