import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en';
import am from './am';
import om from './om';
import ti from './ti';
import { translationDictionary } from '../services/translationDictionary';

// Recursively flatten nested locale objects (e.g. { nav: { dashboard: '...' } } -> { 'nav.dashboard': '...' })
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }
  return result;
}

// Build consolidated translation bundle for a language code
function buildBundle(lang: 'en' | 'am' | 'om' | 'ti', structuredLocale: Record<string, any>) {
  const flattened = flattenObject(structuredLocale);
  const phrases: Record<string, string> = {};

  for (const [phrase, dictItem] of Object.entries(translationDictionary)) {
    if (lang === 'en') {
      phrases[phrase] = phrase;
    } else if (dictItem && (dictItem as any)[lang]) {
      phrases[phrase] = (dictItem as any)[lang];
    }
  }

  return {
    ...structuredLocale,
    ...flattened,
    ...phrases,
  };
}

// Consolidated resources for i18next
const resources = {
  en: { translation: buildBundle('en', en) },
  am: { translation: buildBundle('am', am) },
  om: { translation: buildBundle('om', om) },
  ti: { translation: buildBundle('ti', ti) },
};

const initialLanguage =
  (typeof window !== 'undefined' &&
    (localStorage.getItem('user-app-language') || localStorage.getItem('i18nextLng'))) ||
  'en';

const normalizedInitial = initialLanguage.split('-')[0];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: ['en', 'am', 'om', 'ti'].includes(normalizedInitial) ? normalizedInitial : 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'user-app-language',
    },
    react: {
      useSuspense: false,
    },
  });

// Unified userLanguages metadata mapping for backward compatibility and selector UI
export const userLanguages = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    countryCode: 'GB',
    translations: resources.en.translation,
  },
  am: {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    flag: '🇪🇹',
    countryCode: 'ET',
    translations: resources.am.translation,
  },
  om: {
    code: 'om',
    name: 'Afaan Oromoo',
    nativeName: 'Oromoo',
    flag: '🇪🇹',
    countryCode: 'ET',
    translations: resources.om.translation,
  },
  ti: {
    code: 'ti',
    name: 'Tigrinya',
    nativeName: 'ትግርኛ',
    flag: '🇪🇹',
    countryCode: 'ET',
    translations: resources.ti.translation,
  },
};

export const defaultUserLanguage = 'en';

export { en, am, om, ti };
export default i18n;