import { create } from "zustand";
import { api } from "@/services/api";
import { ConversationWithDetails, MessageWithSender } from "@levaconnect/shared";

interface MessagesState {
  conversations: ConversationWithDetails[];
  activeConversation: ConversationWithDetails | null;
  messages: MessageWithSender[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;

  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string, page?: number) => Promise<void>;
  createConversation: (participantId: string) => Promise<string>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  setActiveConversation: (conversation: ConversationWithDetails | null) => void;
  addMessage: (message: MessageWithSender) => void;
  clearError: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  isLoadingMessages: false,
  error: null,
  page: 1,
  hasMore: true,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getConversations();
      set({ conversations: data.items || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch conversations", isLoading: false });
    }
  },

  fetchMessages: async (conversationId: string, page = 1) => {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      set({ isLoadingMessages: true, error: null, messages: [], page: 1, hasMore: true });
    } else {
      set({ isLoadingMessages: true });
    }

    try {
      const data = await api.getMessages(conversationId, page, 50);
      const newMessages = data.items || [];

      if (isInitialLoad) {
        set({ messages: newMessages.reverse(), page, hasMore: data.page < data.totalPages, isLoadingMessages: false });
      } else {
        set((state) => ({
          messages: [...newMessages.reverse(), ...state.messages],
          page,
          hasMore: data.page < data.totalPages,
          isLoadingMessages: false,
        }));
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch messages", isLoadingMessages: false });
    }
  },

  createConversation: async (participantId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.createConversation(participantId);
      // Refresh conversations
      await get().fetchConversations();
      set({ isLoading: false });
      return data.id;
    } catch (error: any) {
      set({ error: error.message || "Failed to create conversation", isLoading: false });
      throw error;
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    try {
      const message = await api.sendMessage(conversationId, content);
      set((state) => ({
        messages: [...state.messages, message],
      }));
      // Update conversation list with last message
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: message, updatedAt: new Date().toISOString() }
            : c
        ),
      }));
    } catch (error: any) {
      set({ error: error.message || "Failed to send message" });
      throw error;
    }
  },

  setActiveConversation: (conversation) => set({ activeConversation: conversation }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      conversations: state.conversations.map((c) =>
        c.id === message.conversationId
          ? { ...c, lastMessage: message, updatedAt: new Date().toISOString() }
          : c
      ),
    })),

  clearError: () => set({ error: null }),
}));