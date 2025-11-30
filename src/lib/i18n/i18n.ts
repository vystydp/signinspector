/**
 * Lightweight client-side i18n implementation
 * No dependencies, serverless-friendly, uses browser's Intl API
 */

import { writable, derived } from 'svelte/store';

// Get base path for proper asset loading in production
function getBasePath(): string {
  // In production (GitHub Pages), the path includes /signinspector
  // In development, use empty string
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/signinspector')) {
    return '/signinspector';
  }
  return '';
}

type Translations = Record<string, string>;

interface I18nState {
  locale: string;
  fallbackLocale: string;
  translations: Translations;
  fallbackTranslations: Translations;
  loadedLocales: Set<string>;
}

const state: I18nState = {
  locale: 'en',
  fallbackLocale: 'en',
  translations: {},
  fallbackTranslations: {},
  loadedLocales: new Set(),
};

// Create a reactive store for translations
const translationsStore = writable<Translations>({});
const fallbackTranslationsStore = writable<Translations>({});
const localeStore = writable<string>('en');

/**
 * Detect user's preferred locale from browser
 * Checks localStorage first for manual selection, then auto-detects
 */
export function detectLocale(): string {
  // Check if user has manually selected a locale
  if (typeof window !== 'undefined') {
    const savedLocale = localStorage.getItem('signinspector-locale');
    if (savedLocale) {
      return savedLocale;
    }
  }

  const browserLang = navigator.language.toLowerCase();

  // Map browser locales to supported locales
  if (browserLang.startsWith('cs')) return 'cs';
  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('sk')) return 'cs'; // Slovak users can use Czech
  if (browserLang.startsWith('de')) return 'de';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('it')) return 'it';
  if (browserLang.startsWith('pl')) return 'pl';

  return 'en'; // Default fallback
}

/**
 * Load translations for a specific locale
 */
export async function loadLocale(locale: string): Promise<void> {
  // Always ensure fallback locale is loaded first
  if (!state.loadedLocales.has(state.fallbackLocale)) {
    try {
      const basePath = getBasePath();
      const response = await fetch(`${basePath}/locales/${state.fallbackLocale}.json`);
      if (response.ok) {
        const fallbackTranslations: Translations = await response.json();
        state.fallbackTranslations = fallbackTranslations;
        state.loadedLocales.add(state.fallbackLocale);
        fallbackTranslationsStore.set(fallbackTranslations);
      }
    } catch (error) {
      console.error(`Failed to load fallback locale ${state.fallbackLocale}`, error);
    }
  }

  if (state.loadedLocales.has(locale) && locale === state.locale) {
    return;
  }

  try {
    const basePath = getBasePath();
    const response = await fetch(`${basePath}/locales/${locale}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load locale ${locale}`);
    }

    const translations: Translations = await response.json();
    state.translations = translations;
    state.locale = locale;
    state.loadedLocales.add(locale);

    // Update stores for reactivity
    translationsStore.set(translations);
    localeStore.set(locale);
  } catch (error) {
    console.warn(`Failed to load locale ${locale}, falling back to ${state.fallbackLocale}`, error);

    if (locale !== state.fallbackLocale) {
      await loadLocale(state.fallbackLocale);
    }
  }
}

/**
 * Translate a key with optional variable interpolation
 * Supports nested keys with dot notation: "status.valid"
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  let text = state.translations[key] || state.fallbackTranslations[key];

  if (!text) {
    return key; // Return key itself if translation not found
  }

  // Interpolate variables like {{varName}}
  if (vars) {2
    Object.keys(vars).forEach(varKey => {
      text = text?.replace(new RegExp(`{{${varKey}}}`, 'g'), String(vars[varKey]));
    });
  }

  return text;
}

/**
 * Create a reactive translation function for Svelte components
 */
export const tStore = derived(
  [translationsStore, fallbackTranslationsStore],
  ([$translations, $fallbackTranslations]) => {
    return (key: string, vars?: Record<string, string | number>): string => {
      // Try current locale first, then fallback
      let text = $translations[key] || $fallbackTranslations[key];

      if (!text) {
        return key; // Return key itself if translation not found
      }

      // Interpolate variables like {{varName}}
      if (vars) {
        Object.keys(vars).forEach(varKey => {
          text = text?.replace(new RegExp(`{{${varKey}}}`, 'g'), String(vars[varKey]));
        });
      }

      return text;
    };
  }
);

/**
 * Get current locale
 */
export function getCurrentLocale(): string {
  return state.locale;
}

/**
 * Get current locale as a store (reactive)
 */
export { localeStore };

/**
 * Set locale and load translations
 * Saves the selection to localStorage for persistence
 */
export async function setLocale(locale: string): Promise<void> {
  await loadLocale(locale);
  // Persist user's manual selection
  if (typeof window !== 'undefined') {
    localStorage.setItem('signinspector-locale', locale);
  }
}

/**
 * Format date using Intl API
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  return new Intl.DateTimeFormat(state.locale, defaultOptions).format(date);
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(state.locale, { numeric: 'auto' });

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return rtf.format(-diffMinutes, 'minute');
    }
    return rtf.format(-diffHours, 'hour');
  }

  if (diffDays < 30) {
    return rtf.format(-diffDays, 'day');
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return rtf.format(-diffMonths, 'month');
  }

  const diffYears = Math.floor(diffDays / 365);
  return rtf.format(-diffYears, 'year');
}

/**
 * Get list of supported locales
 */
export function getSupportedLocales(): Array<{ code: string; name: string; nativeName: string }> {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
    { code: 'zh', name: 'Chinese', nativeName: '简体中文' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  ];
}
