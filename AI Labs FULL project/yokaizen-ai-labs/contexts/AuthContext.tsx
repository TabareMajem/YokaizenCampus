
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserStats } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserStats | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithPhone: (phoneNumber: string) => Promise<string>;
  verifyOtp: (verificationId: string, otp: string, phoneNumber: string) => Promise<void>;
  logout: () => void;
  updateUser: (u: UserStats) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const sessionUser = await authService.getSession();
        if (sessionUser) setUser(sessionUser);
      } catch (e) {
        console.error("Auth Init Failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const signInWithPhone = async (phoneNumber: string) => {
      return await authService.signInWithPhoneNumber(phoneNumber);
  };

  const verifyOtp = async (verificationId: string, otp: string, phoneNumber: string) => {
      const u = await authService.verifyOtp(verificationId, otp, phoneNumber);
      setUser(u);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUser = (u: UserStats) => {
      setUser(u);
      authService.updateUserData(u);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, signInWithPhone, verifyOtp, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
