// src/components/PrivateRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "@/context/hooks";

export const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return children;
};
