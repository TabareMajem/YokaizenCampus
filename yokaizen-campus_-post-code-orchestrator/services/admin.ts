
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

  setSchoolLicense: async (key: string) => {
    if (key) {
      localStorage.setItem('school_mode', 'true');
      return API.admin.setSchoolKey(key);
    } else {
      localStorage.setItem('school_mode', 'false');
      return API.admin.setSchoolKey('');
    }
  }
};
