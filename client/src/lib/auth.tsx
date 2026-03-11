import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";

type User = {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  avatar: string | null;
  createdAt: Date;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  requestMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<{ needsOnboarding: boolean }>;
  completeProfile: (displayName: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function refetchUser() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      }
    } catch (error) {
      console.error("Refetch failed:", error);
    }
  }

  async function requestMagicLink(email: string) {
    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to send magic link");
    }
  }

  async function verifyMagicLink(token: string): Promise<{ needsOnboarding: boolean }> {
    const res = await fetch(`/api/auth/verify?token=${token}`, { credentials: "include" });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to verify magic link");
    }

    const data = await res.json();
    setUser(data.user);
    return { needsOnboarding: data.needsOnboarding };
  }

  async function completeProfile(displayName: string, username: string) {
    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, username }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to complete profile");
    }

    const userData = await res.json();
    setUser(userData);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setLocation("/");
  }

  return (
    <AuthContext.Provider value={{ user, loading, requestMagicLink, verifyMagicLink, completeProfile, logout, refetchUser, refreshUser: refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
