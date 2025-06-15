import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  suspended: boolean;
  refreshSuspended: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);

  // Returns true if the user's company is suspended (is_active = false)
  async function checkSuspended(uid: string): Promise<boolean> {
    try {
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', uid)
        .single();

      if (userErr || !userRow?.company_id) return false;

      const { data: companyRow, error: compErr } = await supabase
        .from('companies')
        .select('is_active')
        .eq('id', userRow.company_id)
        .single();

      if (compErr || companyRow == null) return false;

      return companyRow.is_active === false;
    } catch (e) {
      return false;
    }
  }

  useEffect(() => {
    // Get initial session
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const suspended = await checkSuspended(session.user.id);
        setSuspended(suspended);
      }
      setLoading(false);
    })();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const suspended = await checkSuspended(session.user.id);
          setSuspended(suspended);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const refreshSuspended = async () => {
    if (!user) return;
    const suspendedNow = await checkSuspended(user.id);
    setSuspended(suspendedNow);
  };

  const value = {
    session,
    user,
    loading,
    suspended,
    refreshSuspended,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 