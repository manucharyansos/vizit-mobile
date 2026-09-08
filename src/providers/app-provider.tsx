import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { themes, ThemeMode } from '@/constants/vizit-theme';
import { Locale, TranslationKey, translations } from '@/i18n/translations';

type Value = { ready: boolean; locale: Locale; setLocale: (value: Locale) => void; mode: ThemeMode; toggleMode: () => void; theme: (typeof themes)[ThemeMode]; t: (key: TranslationKey) => string };
const Context = createContext<Value | null>(null);
const preferenceKeys = { locale: 'vizit.preference.locale.v1', mode: 'vizit.preference.theme.v1' } as const;
export function AppProvider({ children }: PropsWithChildren) {
  const language = Localization.getLocales()[0]?.languageCode;
  const [locale, setLocale] = useState<Locale>(language === 'hy' || language === 'ru' ? language : 'en');
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);
  useEffect(() => { Promise.all([SecureStore.getItemAsync(preferenceKeys.locale), SecureStore.getItemAsync(preferenceKeys.mode)]).then(([savedLocale, savedMode]) => { if (savedLocale === 'hy' || savedLocale === 'ru' || savedLocale === 'en') setLocale(savedLocale); if (savedMode === 'light' || savedMode === 'dark') setMode(savedMode); }).catch(() => undefined).finally(() => setReady(true)); }, []);
  const changeLocale = useCallback((value: Locale) => { setLocale(value); void SecureStore.setItemAsync(preferenceKeys.locale, value).catch(() => undefined); }, []);
  const toggleMode = useCallback(() => setMode((current) => { const next = current === 'dark' ? 'light' : 'dark'; void SecureStore.setItemAsync(preferenceKeys.mode, next).catch(() => undefined); return next; }), []);
  const value = useMemo(() => ({ ready, locale, setLocale: changeLocale, mode, toggleMode, theme: themes[mode], t: (key: TranslationKey) => translations[locale][key] }), [changeLocale, locale, mode, ready, toggleMode]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() { const value = useContext(Context); if (!value) throw new Error('useApp requires AppProvider'); return value; }
