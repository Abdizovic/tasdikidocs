import { usePreferences } from '@/context/PreferencesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { themes } from './index';

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const { themeMode } = usePreferences();
  const effectiveScheme = themeMode === 'system' ? systemScheme : themeMode;
  return themes[effectiveScheme === 'dark' ? 'dark' : 'light'];
}
