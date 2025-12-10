
import { User, UserRole } from '../types';
import { API } from './api';

const SESSION_KEY = 'bridge_session';

export const AuthService = {
  login: async (email: string, password: string): Promise<User> => {
    return API.auth.login(email, password);
  },

  register: async (email: string, password: string, name: string, role: UserRole): Promise<User> => {
    return API.auth.register(email, password, name, role);
  },

  logout: async () => {
    await API.auth.logout();
  },

  getCurrentUser: (): User | null => {
    return API.auth.getCurrentUser();
  },

  refreshProfile: async (): Promise<User> => {
    return API.auth.getProfile();
  }
};
