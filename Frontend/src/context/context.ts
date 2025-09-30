// src/context/context.ts
import { createContext } from "react";
import type { User, Role } from "./types";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  setAuth: (user: User, token: string, opts?: { silent?: boolean }) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (...roles: Role[]) => boolean;
  isAdmin: boolean;
  isLoading: boolean;
  hydrated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  setAuth: () => {},
  updateUser: () => {},
  logout: () => {},
  isAuthenticated: false,
  hasRole: () => false,
  isAdmin: false,
  isLoading: true,
  hydrated: false,
});
