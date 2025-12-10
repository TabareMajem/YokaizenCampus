
import { User, UserRole, AdminStats, ClassroomStudentSummary } from '../types';

/**
 * Yokaizen Campus API Gateway
 * 
 * Connected to the real backend API.
 * API_BASE_URL is configured via environment variable or defaults to production.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Token management
const getAuthToken = (): string | null => localStorage.getItem('access_token');
const getRefreshToken = (): string | null => localStorage.getItem('refresh_token');

const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Authenticated fetch with JWT
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response = await fetch(url, { ...options, headers });

  // If unauthorized, try to refresh token
  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await API.auth.refreshTokens();
    if (refreshed) {
      // Retry with new token
      headers['Authorization'] = `Bearer ${getAuthToken()}`;
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
};

export const API = {

  // --- AUTHENTICATION ---
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message || 'Invalid credentials');
      }

      const data = await res.json();
      setTokens(data.data.accessToken, data.data.refreshToken);

      // Store user in session for quick access
      localStorage.setItem('bridge_session', JSON.stringify(data.data.user));

      return data.data.user;
    },

    register: async (email: string, password: string, name: string, role: UserRole): Promise<User> => {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName: name,
          role: role.toUpperCase()
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(error.message || 'Registration failed');
      }

      const data = await res.json();
      setTokens(data.data.accessToken, data.data.refreshToken);
      localStorage.setItem('bridge_session', JSON.stringify(data.data.user));

      return data.data.user;
    },

    logout: async () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
        } catch (e) {
          // Ignore logout errors
        }
      }
      clearTokens();
      localStorage.removeItem('bridge_session');
    },

    refreshTokens: async (): Promise<boolean> => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;

      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          clearTokens();
          return false;
        }

        const data = await res.json();
        setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      } catch {
        clearTokens();
        return false;
      }
    },

    getCurrentUser: (): User | null => {
      const session = localStorage.getItem('bridge_session');
      return session ? JSON.parse(session) : null;
    },

    getProfile: async (): Promise<User> => {
      const res = await authFetch(`${API_BASE_URL}/auth/me`);
      if (!res.ok) throw new Error('Failed to get profile');
      const data = await res.json();
      localStorage.setItem('bridge_session', JSON.stringify(data.data));
      return data.data;
    }
  },

  // --- CLASSROOM MANAGEMENT (Teacher View) ---
  classroom: {
    getLiveStatus: async (classroomId?: string): Promise<ClassroomStudentSummary[]> => {
      const url = classroomId
        ? `${API_BASE_URL}/classroom/${classroomId}/live`
        : `${API_BASE_URL}/classroom/live`;
      const res = await authFetch(url);

      if (!res.ok) {
        console.error('Failed to get classroom status');
        return [];
      }

      const data = await res.json();
      return data.data || [];
    },

    create: async (name: string, maxStudents: number = 30): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/classroom`, {
        method: 'POST',
        body: JSON.stringify({ name, maxStudents }),
      });

      if (!res.ok) throw new Error('Failed to create classroom');
      return (await res.json()).data;
    },

    join: async (accessCode: string): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/classroom/join`, {
        method: 'POST',
        body: JSON.stringify({ accessCode }),
      });

      if (!res.ok) throw new Error('Invalid classroom code');
      return (await res.json()).data;
    },

    broadcastMessage: async (classroomId: string, message: string, type: string = 'INFO') => {
      const res = await authFetch(`${API_BASE_URL}/classroom/${classroomId}/broadcast`, {
        method: 'POST',
        body: JSON.stringify({ message, type }),
      });

      if (!res.ok) throw new Error('Failed to broadcast message');
      return (await res.json()).data;
    },

    triggerChaos: async (classroomId: string, eventType: string, duration: number = 60) => {
      const res = await authFetch(`${API_BASE_URL}/classroom/${classroomId}/chaos`, {
        method: 'POST',
        body: JSON.stringify({ eventType, duration }),
      });

      if (!res.ok) throw new Error('Failed to trigger chaos event');
      return (await res.json()).data;
    }
  },

  // --- GRAPH SESSIONS ---
  graph: {
    create: async (classroomId?: string, title?: string): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/graph`, {
        method: 'POST',
        body: JSON.stringify({ classroomId, title }),
      });

      if (!res.ok) throw new Error('Failed to create graph session');
      return (await res.json()).data;
    },

    sync: async (sessionId: string, nodes: any[], connections: any[], status?: string): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/graph/${sessionId}/sync`, {
        method: 'PUT',
        body: JSON.stringify({ nodes, connections, status }),
      });

      if (!res.ok) throw new Error('Failed to sync graph');
      return (await res.json()).data;
    },

    audit: async (sessionId: string, nodeId: string): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/graph/${sessionId}/audit`, {
        method: 'POST',
        body: JSON.stringify({ nodeId }),
      });

      if (!res.ok) throw new Error('Failed to audit node');
      return (await res.json()).data;
    }
  },

  // --- AI SERVICE ---
  ai: {
    command: async (command: string, philosophyMode: string = 'JAPAN'): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/ai/command`, {
        method: 'POST',
        body: JSON.stringify({ command, philosophyMode }),
      });

      if (!res.ok) throw new Error('Failed to generate graph');
      return (await res.json()).data;
    },

    simulate: async (nodeId: string, agentType: string, prompt: string, context: string): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/ai/simulate`, {
        method: 'POST',
        body: JSON.stringify({ nodeId, agentType, prompt, context }),
      });

      if (!res.ok) throw new Error('Simulation failed');
      return (await res.json()).data;
    },

    audit: async (nodeId: string, output: string): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/ai/audit`, {
        method: 'POST',
        body: JSON.stringify({ nodeId, output }),
      });

      if (!res.ok) throw new Error('Audit failed');
      return (await res.json()).data;
    },

    getAgents: async (): Promise<any[]> => {
      const res = await authFetch(`${API_BASE_URL}/ai/agents`);
      if (!res.ok) return [];
      return (await res.json()).data || [];
    }
  },

  // --- ADMIN & ANALYTICS ---
  admin: {
    getStats: async (): Promise<AdminStats> => {
      const res = await authFetch(`${API_BASE_URL}/admin/stats`);

      if (!res.ok) {
        // Return default stats if not authorized
        return {
          totalUsers: 0,
          activeSessions: 0,
          globalTokensUsed: 0,
          schoolLicenseActive: false,
          systemHealth: 'OPTIMAL'
        };
      }

      return (await res.json()).data;
    },

    getAllUsers: async (): Promise<User[]> => {
      const res = await authFetch(`${API_BASE_URL}/admin/users`);
      if (!res.ok) return [];
      return (await res.json()).data || [];
    },

    updateUserRole: async (userId: string, newRole: UserRole): Promise<void> => {
      const res = await authFetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update user role');
    },

    deleteUser: async (userId: string): Promise<void> => {
      const res = await authFetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete user');
    }
  },

  // --- GAMIFICATION ---
  gamification: {
    getProfile: async (): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/gamification/profile`);
      if (!res.ok) throw new Error('Failed to get gamification profile');
      return (await res.json()).data;
    },

    getCareer: async (): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/gamification/career`);
      if (!res.ok) throw new Error('Failed to get career path');
      return (await res.json()).data;
    },

    getLeaderboard: async (limit: number = 10): Promise<any[]> => {
      const res = await authFetch(`${API_BASE_URL}/gamification/leaderboard?limit=${limit}`);
      if (!res.ok) return [];
      return (await res.json()).data || [];
    }
  },

  // --- PAYMENTS ---
  payment: {
    createCheckout: async (productKey: string, successUrl: string, cancelUrl: string): Promise<{ sessionId: string; url: string }> => {
      const res = await authFetch(`${API_BASE_URL}/payment/checkout`, {
        method: 'POST',
        body: JSON.stringify({ productKey, successUrl, cancelUrl }),
      });

      if (!res.ok) throw new Error('Failed to create checkout session');
      return (await res.json()).data;
    },

    getStatus: async (): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/payment/status`);
      if (!res.ok) throw new Error('Failed to get subscription status');
      return (await res.json()).data;
    },

    cancel: async (): Promise<any> => {
      const res = await authFetch(`${API_BASE_URL}/payment/cancel`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to cancel subscription');
      return (await res.json()).data;
    }
  },

  // --- AI PROXY SERVICE (for direct calls when needed) ---
  aiProxy: {
    generateContent: async (payload: any) => {
      const res = await authFetch(`${API_BASE_URL}/ai/generate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('AI generation failed');
      return (await res.json()).data;
    }
  }
};
