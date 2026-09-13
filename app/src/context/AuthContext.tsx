import * as mockApi from '@/lib/mockApi';
import { supabase } from '@/lib/supabase';
import type { AuthSession, Profile } from '@/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  completeMfaLogin: (factorId: string, code: string) => Promise<AuthSession>;
  signUpVerifier: (input: mockApi.SignUpVerifierInput) => Promise<AuthSession>;
  applyAsInstitution: (input: mockApi.InstitutionApplicationInput) => Promise<AuthSession>;
  updateProfile: (input: mockApi.UpdateProfileInput) => Promise<Profile>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase's client persists its own session (see the SecureStore-backed
  // adapter in src/lib/supabase.ts) — this just checks whether one exists.
  useEffect(() => {
    (async () => {
      try {
        const restored = await mockApi.restoreSession();
        setSession(restored);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Supabase ends the session on its own when a refresh token is rejected
  // (expired, revoked, or signed out in another tab). Without this, the app
  // keeps rendering protected screens whose API calls then fail with 401.
  // Only SIGNED_OUT is handled — sign-in flows set the session themselves,
  // and MFA can emit SIGNED_IN before the second factor is complete.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setSession(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const applySession = useCallback((next: AuthSession) => {
    setSession(next);
    return next;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => applySession(await mockApi.signIn(email, password)),
    [applySession],
  );

  const completeMfaLogin = useCallback(
    async (factorId: string, code: string) => applySession(await mockApi.completeMfaLogin(factorId, code)),
    [applySession],
  );

  const signUpVerifier = useCallback(
    async (input: mockApi.SignUpVerifierInput) => applySession(await mockApi.signUpVerifier(input)),
    [applySession],
  );

  const applyAsInstitution = useCallback(
    async (input: mockApi.InstitutionApplicationInput) => applySession(await mockApi.applyAsInstitution(input)),
    [applySession],
  );

  const updateProfile = useCallback(
    async (input: mockApi.UpdateProfileInput) => {
      if (!session) throw new Error('No active session');
      const profile = await mockApi.updateProfile(session.profile.id, input);
      setSession((prev) => (prev ? { ...prev, profile } : prev));
      return profile;
    },
    [session],
  );

  const signOut = useCallback(async () => {
    await mockApi.signOutSupabase();
    setSession(null);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!session) return;
    const refreshed = await mockApi.restoreSession();
    setSession(refreshed);
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      signIn,
      completeMfaLogin,
      signUpVerifier,
      applyAsInstitution,
      updateProfile,
      signOut,
      refreshSession,
    }),
    [session, isLoading, signIn, completeMfaLogin, signUpVerifier, applyAsInstitution, updateProfile, signOut, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
