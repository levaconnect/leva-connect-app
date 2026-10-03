import { create } from "zustand";
import { api } from "@/services/api";
import { PostWithAuthor, CommentWithAuthor } from "@levaconnect/shared";

interface FeedState {
  posts: PostWithAuthor[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;

  fetchPosts: (page?: number) => Promise<void>;
  refreshPosts: () => Promise<void>;
  createPost: (content: string) => Promise<void>;
  updatePost: (id: string, content: string) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  likePost: (id: string) => Promise<void>;
  unlikePost: (id: string) => Promise<void>;
  addComment: (postId: string, comment: CommentWithAuthor) => void;
  clearError: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  page: 1,
  hasMore: true,

  fetchPosts: async (page = 1) => {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      set({ isLoading: true, error: null });
    } else {
      set({ isLoading: true });
    }

    try {
      const data = await api.getPosts(page, 20);
      const newPosts = data.items || [];

      if (isInitialLoad) {
        set({ posts: newPosts, page, hasMore: data.page < data.totalPages, isLoading: false });
      } else {
        set((state) => ({
          posts: [...state.posts, ...newPosts],
          page,
          hasMore: data.page < data.totalPages,
          isLoading: false,
        }));
      }
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch posts", isLoading: false });
    }
  },

  refreshPosts: async () => {
    set({ isRefreshing: true, error: null });
    try {
      const data = await api.getPosts(1, 20);
      set({ posts: data.items || [], page: 1, hasMore: data.page < data.totalPages, isRefreshing: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to refresh posts", isRefreshing: false });
    }
  },

  createPost: async (content: string) => {
    set({ isLoading: true, error: null });
    try {
      const newPost = await api.createPost(content);
      set((state) => ({ posts: [newPost, ...state.posts], isLoading: false }));
    } catch (error: any) {
      set({ error: error.message || "Failed to create post", isLoading: false });
      throw error;
    }
  },

  updatePost: async (id: string, content: string) => {
    try {
      const updated = await api.updatePost(id, content);
      set((state) => ({
        posts: state.posts.map((p) => (p.id === id ? updated : p)),
      }));
    } catch (error: any) {
      set({ error: error.message || "Failed to update post" });
      throw error;
    }
  },

  deletePost: async (id: string) => {
    try {
      await api.deletePost(id);
      set((state) => ({ posts: state.posts.filter((p) => p.id !== id) }));
    } catch (error: any) {
      set({ error: error.message || "Failed to delete post" });
      throw error;
    }
  },

  likePost: async (id: string) => {
    const post = get().posts.find((p) => p.id === id);
    if (!post) return;

    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === id ? { ...p, isLiked: true, likeCount: p.likeCount + 1 } : p
      ),
    }));

    try {
      await api.likePost(id);
    } catch (error: any) {
      // Rollback on error
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === id ? { ...p, isLiked: false, likeCount: p.likeCount - 1 } : p
        ),
      }));
      throw error;
    }
  },

  unlikePost: async (id: string) => {
    const post = get().posts.find((p) => p.id === id);
    if (!post) return;

    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === id ? { ...p, isLiked: false, likeCount: p.likeCount - 1 } : p
      ),
    }));

    try {
      await api.unlikePost(id);
    } catch (error: any) {
      // Rollback on error
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === id ? { ...p, isLiked: true, likeCount: p.likeCount + 1 } : p
        ),
      }));
      throw error;
    }
  },

  addComment: (postId: string, comment: CommentWithAuthor) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
      ),
    }));
  },

  clearError: () => set({ error: null }),
}));