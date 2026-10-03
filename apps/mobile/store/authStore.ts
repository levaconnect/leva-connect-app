import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { api } from "@/services/api";
import { UserRole, MembershipStatus } from "@levaconnect/shared";

interface User {
  id: string;
  email: string;
  role: UserRole;
  membershipStatus: MembershipStatus | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  membershipStatus: MembershipStatus | null;

  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  updateMembershipStatus: (status: MembershipStatus) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      membershipStatus: null,

      initializeAuth: async () => {
        try {
          await api.initialize();
          const accessToken = await SecureStore.getItemAsync("accessToken");
          
          if (accessToken) {
            try {
              const userData = await api.getMe();
              if (userData) {
                set({
                  user: userData,
                  isAuthenticated: true,
                  membershipStatus: userData.membershipStatus,
                  isInitialized: true,
                });
                return;
              }
            } catch {
              // Token invalid, clear and redirect to login
              await api.clearTokens();
            }
          }
        } catch (error) {
          console.error("Auth initialization failed:", error);
        } finally {
          set({ isInitialized: true });
        }
      },

      login: async (email: string, password: string) => {
        const { accessToken, refreshToken } = await api.login(email, password);
        api.setTokens(accessToken, refreshToken);
        
        const userData = await api.getMe();
        set({
          user: userData,
          isAuthenticated: true,
          membershipStatus: userData.membershipStatus,
        });
      },

      register: async (email: string, password: string, fullName: string) => {
        const { accessToken, refreshToken } = await api.register(email, password, fullName);
        api.setTokens(accessToken, refreshToken);
        
        const userData = await api.getMe();
        set({
          user: userData,
          isAuthenticated: true,
          membershipStatus: userData.membershipStatus,
        });
      },

      logout: async () => {
        try {
          await api.logout();
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          api.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            membershipStatus: null,
          });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user, membershipStatus: user?.membershipStatus || null });
      },

      updateMembershipStatus: (status: MembershipStatus) => {
        set((state) => ({
          user: state.user ? { ...state.user, membershipStatus: status } : null,
          membershipStatus: status,
        }));
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => SecureStore),
      partialize: (state) => ({
        // Don't persist user object, just tokens are in SecureStore via api
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);