
import { User, UserRole, AdminStats } from '../types';
import { API } from './api';

export const AdminService = {
  getStats: async (): Promise<AdminStats> => {
    return API.admin.getStats();
  },

  getAllUsers: async (): Promise<User[]> => {
    return API.admin.getAllUsers();
  },

  updateUserRole: async (userId: string, newRole: UserRole): Promise<void> => {
    return API.admin.updateUserRole(userId, newRole);
  },

  deleteUser: async (userId: string): Promise<void> => {
    return API.admin.deleteUser(userId);
  },

  setSchoolLicense: (key: string) => {
    if (key) {
      localStorage.setItem('school_mode', 'true');
      localStorage.setItem('school_key', key);
    } else {
      localStorage.setItem('school_mode', 'false');
      localStorage.removeItem('school_key');
    }
  }
};
