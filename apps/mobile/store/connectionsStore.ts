import { create } from "zustand";
import { api } from "@/services/api";
import { ConnectionRequestWithProfiles, ConnectionWithProfile } from "@levaconnect/shared";

interface ConnectionsState {
  connections: ConnectionWithProfile[];
  incomingRequests: ConnectionRequestWithProfiles[];
  outgoingRequests: ConnectionRequestWithProfiles[];
  isLoading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  sendRequest: (receiverId: string) => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
  cancelRequest: (id: string) => Promise<void>;
  removeConnection: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  connections: [],
  incomingRequests: [],
  outgoingRequests: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [connectionsData, requestsData] = await Promise.all([
        api.getConnections(),
        api.getConnectionRequests(),
      ]);

      set({
        connections: connectionsData.items || [],
        incomingRequests: requestsData.incoming || [],
        outgoingRequests: requestsData.outgoing || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch connections", isLoading: false });
    }
  },

  sendRequest: async (receiverId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.sendConnectionRequest(receiverId);
      // Refresh requests
      const requestsData = await api.getConnectionRequests();
      set({ outgoingRequests: requestsData.outgoing || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to send request", isLoading: false });
      throw error;
    }
  },

  acceptRequest: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.acceptConnectionRequest(id);
      // Refresh all
      await get().fetchAll();
    } catch (error: any) {
      set({ error: error.message || "Failed to accept request", isLoading: false });
      throw error;
    }
  },

  rejectRequest: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.rejectConnectionRequest(id);
      set((state) => ({
        incomingRequests: state.incomingRequests.filter((r) => r.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || "Failed to reject request", isLoading: false });
      throw error;
    }
  },

  cancelRequest: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.cancelConnectionRequest(id);
      set((state) => ({
        outgoingRequests: state.outgoingRequests.filter((r) => r.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || "Failed to cancel request", isLoading: false });
      throw error;
    }
  },

  removeConnection: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.removeConnection(userId);
      set((state) => ({
        connections: state.connections.filter((c) => c.otherUser?.id !== userId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || "Failed to remove connection", isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));