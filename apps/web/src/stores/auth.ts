'use client';

import { create } from 'zustand';
import { auth as authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Returns orgId of the auto-created default workspace */
  register: (email: string, name: string, password: string) => Promise<string>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { user, token } = await authApi.login({ email, password });
    localStorage.setItem('token', token);
    set({ user, isAuthenticated: true });
  },

  register: async (email, name, password) => {
    const { user, token, orgId } = await authApi.register({ email, name, password });
    localStorage.setItem('token', token);
    set({ user, isAuthenticated: true });
    return orgId;
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ isLoading: false });
    }
  },
}));
