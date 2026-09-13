import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

// expo-secure-store has a 2048-byte value limit and no web implementation —
// fine for a JWT-sized session, and web falls back to localStorage instead.
// `typeof window === 'undefined'` is the reliable "am I in Node, not a real
// browser or native runtime" check — it's true only during `expo export`'s
// static SSR prerendering, where there's no localStorage/SecureStore to hit.
const SecureStoreAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (Platform.OS === 'web') return Promise.resolve(window.localStorage.getItem(key));
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set (see .env.local)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// Supabase's auto token refresh only runs while this is told the app is
// foregrounded — without it, a session can silently expire while backgrounded.
// Skipped during static export's Node-based SSR prerendering.
if (typeof window !== 'undefined') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
