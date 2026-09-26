import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en';
import am from './am';
import om from './om';
import ti from './ti';

// Consolidated resources for i18next
const resources = {
  en: { translation: en },
  am: { translation: am },
  om: { translation: om },
  ti: { translation: ti }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Unified userLanguages metadata mapping for backward compatibility
export const userLanguages = {
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    translations: en
  },
  am: {
    name: 'Amharic',
    nativeName: 'አማርኛ',
    flag: '🇪🇹',
    translations: am
  },
  om: {
    name: 'Afaan Oromoo',
    nativeName: 'Oromoo',
    flag: '🇪🇹',
    translations: om
  },
  ti: {
    name: 'Tigrinya',
    nativeName: 'ትግርኛ',
    flag: '🇪🇹',
    translations: ti
  }
};

export const defaultUserLanguage = 'en';

export { en, am, om, ti };
export default i18n;