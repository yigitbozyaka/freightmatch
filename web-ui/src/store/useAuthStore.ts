import { create } from 'zustand';
import { User } from '../models/User';
import { getCurrentUser, logout as apiLogout } from '../services/auth-endpoints';

interface AuthState {
  user: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  checkAuth: async () => {
    set({ loading: true });
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        set({ user: null, loading: false });
        return;
      }
      const currentUser = await getCurrentUser();
      set({ user: currentUser, loading: false });
    } catch (error) {
      console.error("Failed to fetch user", error);
      set({ user: null, loading: false });
    }
  },

  logout: () => {
    apiLogout();
    set({ user: null });
  },
}));
