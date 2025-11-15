// src/routes/RoleRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/hooks";
import type { JSX } from "react";

export default function RoleRoute({
  allow,
  children,
}: {
  allow: Array<"ADMIN" | "MERCHANT" | "MEMBER">;
  children: JSX.Element;
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
