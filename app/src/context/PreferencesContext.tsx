import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

interface Preferences {
  themeMode: ThemeMode;
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
}

const DEFAULT_PREFERENCES: Preferences = {
  themeMode: 'system',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  notifications: { email: true, sms: false, inApp: true },
};

const STORAGE_KEY = 'tasdikidocs.preferences';

async function readStoredPreferences(): Promise<Preferences> {
  try {
    const raw =
      Platform.OS === 'web'
        ? window.localStorage.getItem(STORAGE_KEY)
        : await (await import('expo-secure-store')).getItemAsync(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

async function writeStoredPreferences(prefs: Preferences): Promise<void> {
  const raw = JSON.stringify(prefs);
  if (Platform.OS === 'web') {
    window.localStorage.setItem(STORAGE_KEY, raw);
    return;
  }
  await (await import('expo-secure-store')).setItemAsync(STORAGE_KEY, raw);
}

interface PreferencesContextValue extends Preferences {
  isLoaded: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (language: string) => void;
  setTimezone: (timezone: string) => void;
  setNotificationPreference: (key: keyof NotificationPreferences, value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    readStoredPreferences().then((loaded) => {
      setPrefs(loaded);
      setIsLoaded(true);
    });
  }, []);

  const persist = useCallback((next: Preferences) => {
    setPrefs(next);
    writeStoredPreferences(next);
  }, []);

  const setThemeMode = useCallback((themeMode: ThemeMode) => persist({ ...prefs, themeMode }), [prefs, persist]);
  const setLanguage = useCallback((language: string) => persist({ ...prefs, language }), [prefs, persist]);
  const setTimezone = useCallback((timezone: string) => persist({ ...prefs, timezone }), [prefs, persist]);
  const setNotificationPreference = useCallback(
    (key: keyof NotificationPreferences, value: boolean) =>
      persist({ ...prefs, notifications: { ...prefs.notifications, [key]: value } }),
    [prefs, persist],
  );

  const value = useMemo(
    () => ({ ...prefs, isLoaded, setThemeMode, setLanguage, setTimezone, setNotificationPreference }),
    [prefs, isLoaded, setThemeMode, setLanguage, setTimezone, setNotificationPreference],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}
