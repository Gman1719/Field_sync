import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import i18n, { userLanguages, defaultUserLanguage } from '../locales/index';
import { setTranslationLanguage, translateText } from '../services/translationEngine';

export interface UserLanguageContextValue {
  currentUserLanguage: string;
  language: string;
  changeUserLanguage: (langCode: string) => void;
  userT: (keyOrText: string, params?: Record<string, string | number>) => string;
  t: (keyOrText: string, params?: Record<string, string | number>) => string;
  userLanguages: typeof userLanguages;
}

const UserLanguageContext = createContext<UserLanguageContextValue | null>(null);

export const UserLanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserLanguage, setCurrentUserLanguage] = useState<string>(() => {
    const savedLang = localStorage.getItem('user-app-language') || localStorage.getItem('i18nextLng');
    const normalized = savedLang ? savedLang.split('-')[0] : null;
    if (normalized && (userLanguages as Record<string, any>)[normalized]) {
      return normalized;
    }
    return defaultUserLanguage;
  });

  useEffect(() => {
    localStorage.setItem('user-app-language', currentUserLanguage);
    localStorage.setItem('i18nextLng', currentUserLanguage);
    document.documentElement.lang = currentUserLanguage;
    if (i18n.language !== currentUserLanguage) {
      i18n.changeLanguage(currentUserLanguage);
    }
    // Activate universal DOM translation engine for the selected language
    setTranslationLanguage(currentUserLanguage);
  }, [currentUserLanguage]);

  const changeUserLanguage = (langCode: string) => {
    if ((userLanguages as Record<string, any>)[langCode]) {
      setCurrentUserLanguage(langCode);
      if (i18n.language !== langCode) {
        i18n.changeLanguage(langCode);
      }
      setTranslationLanguage(langCode);
    }
  };

  const userT = (keyOrText: string, params: Record<string, string | number> = {}): string => {
    if (!keyOrText) return '';

    // If key has dots (e.g., 'nav.dashboard'), look up in locales hierarchy
    if (keyOrText.includes('.')) {
      const keys = keyOrText.split('.');
      let translation: any = (userLanguages as Record<string, any>)[currentUserLanguage]?.translations;

      for (const k of keys) {
        if (translation && translation[k] !== undefined) {
          translation = translation[k];
        } else {
          let fallback: any = (userLanguages as Record<string, any>)['en']?.translations;
          for (const fk of keys) {
            if (fallback && fallback[fk] !== undefined) {
              fallback = fallback[fk];
            } else {
              fallback = null;
              break;
            }
          }
          if (fallback) {
            translation = fallback;
            break;
          }
          translation = null;
          break;
        }
      }

      if (typeof translation === 'string') {
        if (params && Object.keys(params).length > 0) {
          Object.keys(params).forEach((param) => {
            translation = translation.replace(new RegExp(`{${param}}`, 'g'), String(params[param]));
          });
        }
        return translation;
      }
    }

    // Direct text / phrase translation via dictionary and pattern matching
    let translated = translateText(keyOrText, currentUserLanguage);

    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach((param) => {
        translated = translated.replace(new RegExp(`{${param}}`, 'g'), String(params[param]));
      });
    }

    return translated || keyOrText;
  };

  return (
    <UserLanguageContext.Provider
      value={{
        currentUserLanguage,
        language: currentUserLanguage,
        changeUserLanguage,
        userT,
        t: userT,
        userLanguages,
      }}
    >
      {children}
    </UserLanguageContext.Provider>
  );
};

export const useUserLanguage = (): UserLanguageContextValue => {
  const context = useContext(UserLanguageContext);
  if (!context) {
    throw new Error('useUserLanguage must be used within a UserLanguageProvider');
  }
  return context;
};

export default UserLanguageContext;
