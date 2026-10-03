import { create } from "zustand";
import { api } from "@/services/api";
import { Profile, PublicProfile } from "@levaconnect/shared";

interface ProfileState {
  myProfile: Profile | null;
  viewedProfile: PublicProfile | null;
  isLoading: boolean;
  error: string | null;

  fetchMyProfile: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  completeOnboarding: (data: any) => Promise<void>;
  updatePrivacy: (visibility: "community" | "connections" | "private") => Promise<void>;
  clearViewedProfile: () => void;
  clearError: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  myProfile: null,
  viewedProfile: null,
  isLoading: false,
  error: null,

  fetchMyProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.getProfile();
      set({ myProfile: profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch profile", isLoading: false });
    }
  },

  fetchProfile: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.getPublicProfile(userId);
      set({ viewedProfile: profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch profile", isLoading: false });
    }
  },

  updateProfile: async (data: Partial<Profile>) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.updateProfile(data);
      set({ myProfile: profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to update profile", isLoading: false });
      throw error;
    }
  },

  completeOnboarding: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.completeOnboarding(data);
      set({ myProfile: profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to complete onboarding", isLoading: false });
      throw error;
    }
  },

  updatePrivacy: async (visibility: "community" | "connections" | "private") => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.updatePrivacy(visibility);
      set({ myProfile: profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to update privacy", isLoading: false });
      throw error;
    }
  },

  clearViewedProfile: () => set({ viewedProfile: null }),
  clearError: () => set({ error: null }),
}));