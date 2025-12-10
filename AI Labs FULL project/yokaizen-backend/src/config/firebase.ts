import * as admin from 'firebase-admin';
import { config } from './env';
import * as fs from 'fs';
import * as path from 'path';

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Try to load service account from file
    const credentialsPath = path.resolve(config.firebase.credentialsPath);
    
    if (fs.existsSync(credentialsPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket,
      });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Load from environment variable (useful for cloud deployments)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket,
      });
    } else {
      // Use application default credentials (for GCP environments)
      firebaseApp = admin.initializeApp({
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket,
      });
    }

    console.log('✅ Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

export const getFirebaseAuth = (): admin.auth.Auth => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
};

export const getFirebaseStorage = (): admin.storage.Storage => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.storage();
};

// Verify Firebase ID token
export const verifyIdToken = async (idToken: string): Promise<admin.auth.DecodedIdToken> => {
  const auth = getFirebaseAuth();
  return auth.verifyIdToken(idToken);
};

// Get user by UID
export const getFirebaseUser = async (uid: string): Promise<admin.auth.UserRecord> => {
  const auth = getFirebaseAuth();
  return auth.getUser(uid);
};

// Get user by phone number
export const getFirebaseUserByPhone = async (phoneNumber: string): Promise<admin.auth.UserRecord> => {
  const auth = getFirebaseAuth();
  return auth.getUserByPhoneNumber(phoneNumber);
};

// Create custom token for extended session
export const createCustomToken = async (uid: string, claims?: object): Promise<string> => {
  const auth = getFirebaseAuth();
  return auth.createCustomToken(uid, claims);
};

// Set custom claims for user
export const setCustomClaims = async (uid: string, claims: object): Promise<void> => {
  const auth = getFirebaseAuth();
  await auth.setCustomUserClaims(uid, claims);
};

// Revoke refresh tokens (logout all devices)
export const revokeRefreshTokens = async (uid: string): Promise<void> => {
  const auth = getFirebaseAuth();
  await auth.revokeRefreshTokens(uid);
};

export default {
  initializeFirebase,
  getFirebaseAuth,
  getFirebaseStorage,
  verifyIdToken,
  getFirebaseUser,
  getFirebaseUserByPhone,
  createCustomToken,
  setCustomClaims,
  revokeRefreshTokens,
};
