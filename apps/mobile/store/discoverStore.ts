import { create } from "zustand";
import { api } from "@/services/api";
import { DiscoverResult } from "@levaconnect/shared";

interface DiscoverState {
  members: DiscoverResult[];
  isLoading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  filters: { search?: string; city?: string };

  fetchDiscover: (page?: number) => Promise<void>;
  search: (query: string) => Promise<void>;
  filterByCity: (city: string) => Promise<void>;
  clearFilters: () => Promise<void>;
  clearError: () => void;
}

export const useDiscoverStore = create<DiscoverState>((set, get) => ({
  members: [],
  isLoading: false,
  error: null,
  page: 1,
  hasMore: true,
  filters: {},

  fetchDiscover: async (page = 1) => {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      set({ isLoading: true, error: null });
    } else {
      set({ isLoading: true });
    }

    try {
      const { search, city } = get().filters;
      const data = await api.discover({ search, city, page, limit: 20 });
      const newMembers = data.items || [];

      if (isInitialLoad) {
        set({ members: newMembers, page, hasMore: data.page < data.totalPages, isLoading: false });
      } else {
        set((state) => ({
          members: [...state.members, ...newMembers],
          page,
          hasMore: data.page < data.totalPages,
          isLoading: false,
        }));
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch members", isLoading: false });
    }
  },

  search: async (query: string) => {
    set({ filters: { ...get().filters, search: query || undefined }, page: 1, hasMore: true });
    await get().fetchDiscover(1);
  },

  filterByCity: async (city: string) => {
    set({ filters: { ...get().filters, city: city || undefined }, page: 1, hasMore: true });
    await get().fetchDiscover(1);
  },

  clearFilters: async () => {
    set({ filters: {}, page: 1, hasMore: true });
    await get().fetchDiscover(1);
  },

  clearError: () => set({ error: null }),
}));