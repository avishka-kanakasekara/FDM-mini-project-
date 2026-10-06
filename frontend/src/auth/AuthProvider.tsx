import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ApiError, getCurrentAccount, signInAccount, signOutAccount, signUpAccount } from "../services/api";
import type { Account } from "../types/prediction";
import { clearSessionToken, getSessionToken, setSessionToken } from "./session";

interface AuthContextValue {
  user: Account | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(Boolean(getSessionToken()));

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    getCurrentAccount()
      .then((account) => {
        if (active) {
          setUser(account);
        }
      })
      .catch(() => {
        clearSessionToken();
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
    }
    window.addEventListener("bankreach:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("bankreach:unauthorized", handleUnauthorized);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signUp(name, email, password) {
        const session = await signUpAccount({ name, email, password });
        setSessionToken(session.token);
        setUser(session.user);
      },
      async signIn(email, password) {
        const session = await signInAccount({ email, password });
        setSessionToken(session.token);
        setUser(session.user);
      },
      async signOut() {
        try {
          await signOutAccount();
        } catch (error) {
          if (!(error instanceof ApiError)) {
            throw error;
          }
        } finally {
          clearSessionToken();
          setUser(null);
        }
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

export function useAuthUserId(): string {
  return useContext(AuthContext)?.user?.id ?? "local";
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <p className="text-sm font-semibold text-muted">Checking your account...</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
