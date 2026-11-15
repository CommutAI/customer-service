import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { DbStaffUser } from '../types';

interface AuthContextValue {
  user: any;
  staffProfile: DbStaffUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [staffProfile, setStaffProfile] = useState<DbStaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('csd_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setStaffProfile(userData);
      } catch (e) {
        localStorage.removeItem('csd_user');
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      // Query staff_users table for the user
      const { data: staffUser, error } = await supabase
        .from('staff_users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !staffUser) {
        return { error: 'Invalid email or password' };
      }

      // Verify password using plain text comparison
      if (staffUser.password !== password) {
        return { error: 'Invalid email or password' };
      }

      // Update last login
      await supabase
        .from('staff_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', staffUser.id);

      // Store user in localStorage
      localStorage.setItem('csd_user', JSON.stringify(staffUser));
      setUser(staffUser);
      setStaffProfile(staffUser);

      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Login failed' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('csd_user');
    setUser(null);
    setStaffProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, staffProfile, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
