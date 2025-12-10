import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPhoneNumber as firebaseSignInWithPhone,
  RecaptchaVerifier,
  ConfirmationResult,
  User as FirebaseUser
} from 'firebase/auth';
import { UserStats, SkillType } from '../types';
import { INITIAL_USER, detectBrowserLanguage } from '../constants';

// Firebase configuration - Shared with Yokaizen Campus
const firebaseConfig = {
  apiKey: "AIzaSyDSwAeEpx7A5KXy-s61PWlDVeZyv9Glrpk",
  authDomain: "yokaizen-campus.firebaseapp.com",
  projectId: "yokaizen-campus",
  storageBucket: "yokaizen-campus.firebasestorage.app",
  messagingSenderId: "341491279919",
  appId: "1:341491279919:web:5d208c5d980f3c5915feda",
  measurementId: "G-VJ64PMCWVQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// API Base URL for backend
const API_BASE = import.meta.env.PROD
  ? 'https://ai.yokaizencampus.com/api/v1'
  : 'http://localhost:7792/api/v1';

// Store confirmation result for OTP verification
let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

// Session storage for JWT token
const TOKEN_KEY = 'yokaizen_ailabs_token';
const USER_KEY = 'yokaizen_ailabs_user';

export const authService = {
  // Initialize reCAPTCHA verifier
  initRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
    if (recaptchaVerifier) {
      return recaptchaVerifier;
    }

    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      'size': 'invisible',
      'callback': () => {
        console.log('reCAPTCHA verified');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
        recaptchaVerifier = null;
      }
    });

    return recaptchaVerifier;
  },

  // Send OTP to phone number
  async signInWithPhoneNumber(phoneNumber: string): Promise<string> {
    try {
      // Ensure reCAPTCHA is initialized
      if (!recaptchaVerifier) {
        this.initRecaptcha();
      }

      confirmationResult = await firebaseSignInWithPhone(auth, phoneNumber, recaptchaVerifier!);
      return confirmationResult.verificationId;
    } catch (error: any) {
      console.error('Phone sign-in error:', error);
      throw new Error(error.message || 'Failed to send verification code');
    }
  },

  // Verify OTP and get/create user
  async verifyOtp(verificationId: string, otp: string, phoneNumber: string): Promise<UserStats> {
    try {
      if (!confirmationResult) {
        throw new Error('No verification in progress');
      }

      // Verify OTP with Firebase
      const credential = await confirmationResult.confirm(otp);
      const firebaseUser = credential.user;

      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken();

      // Sync with backend to get/create user
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          authProvider: 'phone'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify with backend');
      }

      const data = await response.json();
      const { user, token, refreshToken } = data.data;

      // Store tokens
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      // Convert backend user to UserStats format
      return this.mapBackendUserToStats(user);
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw new Error(error.message || 'Invalid verification code');
    }
  },

  // Map backend user to frontend UserStats format
  mapBackendUserToStats(backendUser: any): UserStats {
    return {
      id: backendUser.id,
      email: backendUser.email || `${backendUser.phone}@yokaizen.ai`,
      name: backendUser.username || `Operative ${backendUser.phone?.slice(-4) || 'Unknown'}`,
      phone: backendUser.phone,
      avatar: backendUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.id}`,
      level: backendUser.level || 1,
      xp: Number(backendUser.xp) || 0,
      credits: backendUser.credits || 100,
      streak: backendUser.streak || 0,
      title: this.getTitleForLevel(backendUser.level || 1),
      role: backendUser.role?.toLowerCase() || 'user',
      isPro: backendUser.tier === 'PRO_CREATOR' || backendUser.tier === 'OPERATIVE',
      tier: backendUser.tier || 'FREE',
      language: backendUser.language || detectBrowserLanguage(),
      lastLoginDate: backendUser.lastLogin || new Date().toISOString(),
      completedNodes: [],
      unlockedTools: [],
      unlockedSkills: [],
      skills: {
        PROMPTING: 0,
        SECURITY: 0,
        OPTIMIZATION: 0,
        CREATIVITY: 0,
        DOMAIN: 0,
      },
      inventory: [],
      gameScores: {},
      createdGames: [],
      skillPoints: backendUser.skillPoints || 0,
      squadId: backendUser.squadId,
      // Cross-product access
      aiLabsAccess: backendUser.aiLabsAccess || false,
      campusAccess: backendUser.campusAccess || false,
      subscriptionProduct: backendUser.subscriptionProduct,
    };
  },

  getTitleForLevel(level: number): string {
    if (level >= 50) return 'AI Grandmaster';
    if (level >= 30) return 'Neural Architect';
    if (level >= 20) return 'Pattern Sage';
    if (level >= 10) return 'Data Alchemist';
    if (level >= 5) return 'Prompt Adept';
    return 'Rookie Operative';
  },

  // Get stored session
  async getSession(): Promise<UserStats | null> {
    const userJson = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);

    if (!userJson || !token) {
      return null;
    }

    try {
      // Verify token is still valid with backend
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token expired, try to refresh
        return null;
      }

      const data = await response.json();
      return this.mapBackendUserToStats(data.data);
    } catch (error) {
      console.error('Session check error:', error);
      return JSON.parse(userJson);
    }
  },

  // Get auth token
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Save session (called after user updates)
  saveSession(user: UserStats) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Logout
  async logout() {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear local storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Sign out of Firebase
    await auth.signOut();

    // Reset reCAPTCHA
    confirmationResult = null;
    recaptchaVerifier = null;
  },

  // Update user data on backend
  async updateUserData(user: UserStats): Promise<UserStats> {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      // Fallback to local storage only
      this.saveSession(user);
      return user;
    }

    try {
      const response = await fetch(`${API_BASE}/user/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: user.name,
          avatarUrl: user.avatar,
          language: user.language,
          preferences: {
            notifications: true,
            soundEffects: true,
            darkMode: true,
            language: user.language,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedUser = this.mapBackendUserToStats(data.data);
        this.saveSession(updatedUser);
        return updatedUser;
      }
    } catch (error) {
      console.error('Update user error:', error);
    }

    // Fallback to local
    this.saveSession(user);
    return user;
  },
};

// Export auth instance for use in components
export { auth };
