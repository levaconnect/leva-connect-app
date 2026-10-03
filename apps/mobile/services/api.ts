import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.apiUrl || "http://localhost:4000";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.baseUrl = API_URL;
  }

  async initialize() {
    this.accessToken = await SecureStore.getItemAsync("accessToken");
    this.refreshToken = await SecureStore.getItemAsync("refreshToken");
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    SecureStore.setItemAsync("accessToken", accessToken);
    SecureStore.setItemAsync("refreshToken", refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    SecureStore.deleteItemAsync("accessToken");
    SecureStore.deleteItemAsync("refreshToken");
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, requiresAuth = true, headers, ...fetchOptions } = options;

    const requestHeaders = {
      ...(await this.getAuthHeaders()),
      ...headers,
    };

    const url = this.buildUrl(endpoint, params);

    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });

    if (response.status === 401 && requiresAuth && this.refreshToken && !endpoint.includes("/auth/refresh")) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        const newHeaders = {
          ...requestHeaders,
          Authorization: `Bearer ${this.accessToken}`,
        };
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers: newHeaders,
        });
        return this.handleResponse(retryResponse);
      }
    }

    return this.handleResponse(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error?.message || "Request failed") as Error & {
        code?: string;
        details?: Record<string, unknown>;
        status?: number;
      };
      error.code = data.error?.code;
      error.details = data.error?.details;
      error.status = response.status;
      throw error;
    }

    return data.data ?? data;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token) => resolve(!!token));
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.data?.accessToken) {
        this.accessToken = data.data.accessToken;
        this.refreshToken = data.data.refreshToken;
        await SecureStore.setItemAsync("accessToken", this.accessToken);
        await SecureStore.setItemAsync("refreshToken", this.refreshToken);
        this.refreshSubscribers.forEach((cb) => cb(this.accessToken!));
        return true;
      } else {
        this.clearTokens();
        this.refreshSubscribers.forEach((cb) => cb(null as any));
        return false;
      }
    } catch {
      this.clearTokens();
      this.refreshSubscribers.forEach((cb) => cb(null as any));
      return false;
    } finally {
      this.isRefreshing = false;
      this.refreshSubscribers = [];
    }
  }

  // Auth endpoints
  async register(email: string, password: string, fullName: string) {
    return this.request<{ accessToken: string; refreshToken: string; expiresIn: number }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
      requiresAuth: false,
    });
  }

  async login(email: string, password: string) {
    return this.request<{ accessToken: string; refreshToken: string; expiresIn: number }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      requiresAuth: false,
    });
  }

  async refresh() {
    return this.request<{ accessToken: string; refreshToken: string; expiresIn: number }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: this.refreshToken }),
      requiresAuth: false,
    });
  }

  async logout() {
    await this.request("/auth/logout", { method: "POST" });
    this.clearTokens();
  }

  async getMe() {
    return this.request("/auth/me");
  }

  // Profile endpoints
  async getProfile() {
    return this.request("/profiles/me");
  }

  async updateProfile(data: Partial<{
    fullName: string;
    avatarUrl: string | null;
    dateOfBirth: string | null;
    city: string | null;
    hometown: string | null;
    bio: string | null;
    profession: string | null;
    education: string | null;
    interests: string[];
    visibility: "community" | "connections" | "private";
  }>) {
    return this.request("/profiles/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async completeOnboarding(data: {
    fullName: string;
    avatarUrl?: string | null;
    dateOfBirth?: string | null;
    city?: string | null;
    hometown?: string | null;
    bio?: string | null;
    profession?: string | null;
    education?: string | null;
    interests?: string[];
    visibility?: "community" | "connections" | "private";
  }) {
    return this.request("/profiles/me/onboarding", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPublicProfile(userId: string) {
    return this.request(`/profiles/${userId}`);
  }

  // Membership endpoints
  async getMembershipStatus() {
    return this.request("/membership/status");
  }

  async applyForMembership() {
    return this.request("/membership/apply", { method: "POST" });
  }

  // Admin membership endpoints
  async getApplications(page = 1, limit = 20, status?: string) {
    return this.request("/admin/applications", {
      params: { page: String(page), limit: String(limit), ...(status && { status }) },
    });
  }

  async approveApplication(id: string) {
    return this.request(`/admin/applications/${id}/approve`, { method: "POST" });
  }

  async rejectApplication(id: string, reason: string) {
    return this.request(`/admin/applications/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // Posts endpoints
  async getPosts(page = 1, limit = 20) {
    return this.request("/posts", { params: { page: String(page), limit: String(limit) } });
  }

  async createPost(content: string) {
    return this.request("/posts", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async updatePost(id: string, content: string) {
    return this.request(`/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
  }

  async deletePost(id: string) {
    return this.request(`/posts/${id}`, { method: "DELETE" });
  }

  async likePost(id: string) {
    return this.request(`/posts/${id}/like`, { method: "POST" });
  }

  async unlikePost(id: string) {
    return this.request(`/posts/${id}/like`, { method: "DELETE" });
  }

  async getComments(postId: string, page = 1, limit = 50) {
    return this.request(`/posts/${postId}/comments`, { params: { page: String(page), limit: String(limit) } });
  }

  async createComment(postId: string, content: string) {
    return this.request(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  // Discovery endpoints
  async discover(filters: { search?: string; city?: string; page?: number; limit?: number } = {}) {
    return this.request("/discover", {
      params: {
        ...(filters.search && { search: filters.search }),
        ...(filters.city && { city: filters.city }),
        page: String(filters.page || 1),
        limit: String(filters.limit || 20),
      },
    });
  }

  // Connections endpoints
  async getConnections() {
    return this.request("/connections");
  }

  async sendConnectionRequest(receiverId: string) {
    return this.request("/connections/requests", {
      method: "POST",
      body: JSON.stringify({ receiverId }),
    });
  }

  async getConnectionRequests() {
    return this.request("/connections/requests");
  }

  async acceptConnectionRequest(id: string) {
    return this.request(`/connections/requests/${id}/accept`, { method: "POST" });
  }

  async rejectConnectionRequest(id: string) {
    return this.request(`/connections/requests/${id}/reject`, { method: "POST" });
  }

  async cancelConnectionRequest(id: string) {
    return this.request(`/connections/requests/${id}`, { method: "DELETE" });
  }

  async removeConnection(userId: string) {
    return this.request(`/connections/${userId}`, { method: "DELETE" });
  }

  // Messaging endpoints
  async getConversations() {
    return this.request("/conversations");
  }

  async createConversation(participantId: string) {
    return this.request("/conversations", {
      method: "POST",
      body: JSON.stringify({ participantId }),
    });
  }

  async getMessages(conversationId: string, page = 1, limit = 50) {
    return this.request(`/conversations/${conversationId}/messages`, {
      params: { page: String(page), limit: String(limit) },
    });
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  // Settings endpoints
  async updatePrivacy(visibility: "community" | "connections" | "private") {
    return this.request("/settings/privacy", {
      method: "PATCH",
      body: JSON.stringify({ visibility }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request("/settings/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async deleteAccount(password: string) {
    return this.request("/account", {
      method: "DELETE",
      body: JSON.stringify({ password, confirm: true }),
    });
  }
}

export const api = new ApiClient();