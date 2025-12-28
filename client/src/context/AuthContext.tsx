/**
 * Ruzn-Lite Authentication Context
 * 
 * Provides server-validated authentication state throughout the app.
 * Replaces insecure sessionStorage-based access control.
 */

import { createContext, useContext, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

// User type matching server-side schema (from drizzle/schema.ts users table)
export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { 
    data: user, 
    isLoading, 
    refetch 
  } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Always redirect to home, even if logout fails
      await refetch();
      window.location.href = '/';
    }
  };

  const handleRefetch = async () => {
    await refetch();
  };

  const value: AuthContextType = {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAnalyst: user?.role === 'admin', // Only admin role in current schema
    logout,
    refetch: handleRefetch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook that requires authentication
 * Throws if not authenticated
 */
export function useRequireAuth(): AuthContextType & { user: User } {
  const auth = useAuth();
  
  if (!auth.isAuthenticated || !auth.user) {
    throw new Error('User must be authenticated');
  }
  
  return auth as AuthContextType & { user: User };
}

/**
 * Hook that requires admin role
 */
export function useRequireAdmin(): AuthContextType & { user: User } {
  const auth = useRequireAuth();
  
  if (!auth.isAdmin) {
    throw new Error('Admin access required');
  }
  
  return auth;
}

/**
 * HOC to protect routes
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { adminOnly?: boolean; analystOnly?: boolean }
) {
  return function ProtectedRoute(props: P) {
    const { user, isLoading, isAuthenticated, isAdmin, isAnalyst } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      // Redirect to login or show unauthorized
      window.location.href = '/';
      return null;
    }

    if (options?.adminOnly && !isAdmin) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-gray-600 mt-2">Admin access required</p>
          </div>
        </div>
      );
    }

    if (options?.analystOnly && !isAnalyst) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-gray-600 mt-2">Analyst access required</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
