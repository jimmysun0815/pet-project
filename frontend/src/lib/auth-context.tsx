'use client';

import React, { createContext, useContext } from 'react';
import type { User } from './types';

// Dev mode: auth is bypassed. All users are treated as admin.
// Replace with Supabase or real auth when ready.
const DEV_USER: User = {
  id: 1,
  email: 'admin@petshop.com',
  name: '店长',
  role: 'admin',
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; name: string; phone?: string }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value: AuthContextType = {
    user: DEV_USER,
    token: 'dev-token',
    loading: false,
    login: async () => DEV_USER,
    register: async () => DEV_USER,
    logout: () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
