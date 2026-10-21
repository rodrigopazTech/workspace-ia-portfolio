/**
 * Google Workspace Authentication & Permissions Service
 * Supports decoupled Basic Google Sign-In, Incremental App Permissions, and Demo Mode.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DEMO_USER_PROFILE } from './demoWorkspaceData';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/meetings.space.readonly',
];

export const APP_SCOPE_MAPPING: Record<string, string[]> = {
  gmail: [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.readonly',
  ],
  calendar: [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  drive: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/presentations',
  ],
  tasks: [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/tasks.readonly',
  ],
  contacts: ['https://www.googleapis.com/auth/contacts'],
  keep: [], // Keep & Notes runs in-app with direct sync
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// In-memory token cache (never stored in localStorage as required by security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;
let isDemoSessionActive = false;

// Track permissions granted for individual apps
const appPermissions: Record<string, boolean> = {
  gmail: false,
  calendar: false,
  drive: false,
  tasks: false,
  contacts: false,
  keep: true, // Native module
};

// Registered callbacks
let authSuccessCallback: ((user: User, token: string | null, isDemo: boolean) => void) | null = null;
let authFailureCallback: (() => void) | null = null;

/**
 * Creates a synthetic demo user representing a recruiter or visitor
 */
export const createDemoUser = (): User => {
  return {
    uid: 'demo-recruiter-user-2026',
    displayName: DEMO_USER_PROFILE.displayName,
    email: DEMO_USER_PROFILE.email,
    photoURL: DEMO_USER_PROFILE.photoURL,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'demo-id-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'google.com',
  } as unknown as User;
};

/**
 * Basic Google Sign-In without sensitive Workspace scopes.
 * Solves Google Cloud "App not verified / 403 test users" blocker for all recruiters.
 */
export const basicGoogleSignIn = async (): Promise<{
  user: User;
  accessToken: string | null;
  isDemo: boolean;
} | null> => {
  try {
    isSigningIn = true;
    const basicProvider = new GoogleAuthProvider();
    // Only standard basic profile and email (never restricted scopes)
    basicProvider.setCustomParameters({
      prompt: 'select_account',
    });

    const result = await signInWithPopup(auth, basicProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    isDemoSessionActive = !cachedAccessToken || Object.values(appPermissions).every((v) => !v);

    if (authSuccessCallback) {
      authSuccessCallback(result.user, cachedAccessToken, isDemoSessionActive);
    }

    return {
      user: result.user,
      accessToken: cachedAccessToken,
      isDemo: isDemoSessionActive,
    };
  } catch (error: any) {
    console.error('Basic Google Sign-in error:', error);
    // If popup blocked, throw descriptive message
    if (error.code === 'auth/popup-blocked') {
      throw new Error('La ventana emergente de Google fue bloqueada por tu navegador. Por favor permite popups para este sitio.');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Enter interactive Demo Mode directly (e.g. for recruiters testing without logging in)
 */
export const enterDemoMode = (): { user: User; accessToken: string; isDemo: boolean } => {
  isDemoSessionActive = true;
  cachedAccessToken = 'demo-token';
  const demoUser = createDemoUser();
  if (authSuccessCallback) {
    authSuccessCallback(demoUser, 'demo-token', true);
  }
  return { user: demoUser, accessToken: 'demo-token', isDemo: true };
};

/**
 * Request incremental permission for a specific Google Workspace app.
 * If user is on the Google Cloud Test Users list, Google grants the scope.
 * If user is not on the list, this throws a clear error so the UI can open the Test Users Mailbox.
 */
export const requestAppPermission = async (
  appType: string
): Promise<{
  success: boolean;
  token?: string;
  error?: string;
  isTestUserRequired?: boolean;
}> => {
  const scopes = APP_SCOPE_MAPPING[appType];
  if (!scopes || scopes.length === 0) {
    appPermissions[appType] = true;
    return { success: true };
  }

  try {
    const scopeProvider = new GoogleAuthProvider();
    scopes.forEach((s) => scopeProvider.addScope(s));
    scopeProvider.setCustomParameters({
      prompt: 'consent',
    });

    const result = await signInWithPopup(auth, scopeProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      appPermissions[appType] = true;
      return { success: true, token: credential.accessToken };
    }

    return {
      success: false,
      error: 'No se recibió el token de acceso de Google para esta aplicación.',
    };
  } catch (err: any) {
    console.warn(`Error requesting scope for ${appType}:`, err);

    const errorMessage = err.message || '';
    const isTestRestriction =
      err.code === 'auth/cancelled-popup-request' ||
      errorMessage.toLowerCase().includes('access_denied') ||
      errorMessage.toLowerCase().includes('not verified') ||
      errorMessage.toLowerCase().includes('test user') ||
      errorMessage.toLowerCase().includes('403') ||
      errorMessage.toLowerCase().includes('restricted');

    return {
      success: false,
      error: err.message,
      isTestUserRequired: isTestRestriction,
    };
  }
};

/**
 * Disconnect an app and switch back to Demo Mode for that app
 */
export const disconnectAppPermission = (appType: string) => {
  appPermissions[appType] = false;
};

export const getAppPermissions = (): Record<string, boolean> => {
  return { ...appPermissions };
};

export const isAppConnected = (appType: string): boolean => {
  return Boolean(appPermissions[appType]);
};

export const isDemoModeActive = (): boolean => {
  return isDemoSessionActive;
};

export const setDemoModeActive = (active: boolean) => {
  isDemoSessionActive = active;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Initialize auth listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null, isDemo: boolean) => void,
  onAuthFailure?: () => void
) => {
  if (onAuthSuccess) authSuccessCallback = onAuthSuccess;
  if (onAuthFailure) authFailureCallback = onAuthFailure;

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // User is authenticated with Firebase
      const isDemo = isDemoSessionActive || !cachedAccessToken;
      if (authSuccessCallback) authSuccessCallback(user, cachedAccessToken, isDemo);
    } else if (!isDemoSessionActive) {
      cachedAccessToken = null;
      if (authFailureCallback) authFailureCallback();
    }
  });
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  isDemoSessionActive = false;
  Object.keys(appPermissions).forEach((k) => {
    if (k !== 'keep') appPermissions[k] = false;
  });
  if (authFailureCallback) authFailureCallback();
};
