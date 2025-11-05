'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User, Role } from './types';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasRole: (...roles: Role[]) => boolean;
  isAdmin: boolean;
  isLoading: boolean;
  hydrated: boolean;
  updateUser: (patch: Partial<User>) => void;
  setUser: (user: User | null) => void;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialUser = null,
}) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate user from server on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // استدعاء API للحصول على المستخدم الحالي من الـ cookie
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setHydrated(true);
      }
    };

    // إذا لم يتم توفير initialUser، قم بجلب المستخدم
    if (!initialUser) {
      fetchUser();
    } else {
      setIsLoading(false);
      setHydrated(true);
    }
  }, [initialUser]);

  // Function to refetch user data
  const refetch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has specific role(s)
  const hasRole = (...roles: Role[]) => {
    return !!user && roles.includes(user.role);
  };

  const isAdmin = hasRole('ADMIN');

  // Update user partially
  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...patch };
    });
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    hasRole,
    isAdmin,
    isLoading,
    hydrated,
    updateUser,
    setUser,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

