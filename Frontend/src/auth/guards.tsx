// src/auth/guards.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { JSX } from 'react';

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function RequireRole({ role, children }: { role: 'ADMIN' | 'MERCHANT' | 'MEMBER'; children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}
