import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import i18n, { userLanguages, defaultUserLanguage } from '../locales/index';

export interface UserLanguageContextValue {
  currentUserLanguage: string;
  changeUserLanguage: (langCode: string) => void;
  userT: (key: string, params?: Record<string, string | number>) => string;
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
  }, [currentUserLanguage]);

  const changeUserLanguage = (langCode: string) => {
    if ((userLanguages as Record<string, any>)[langCode]) {
      setCurrentUserLanguage(langCode);
      i18n.changeLanguage(langCode);
    }
  };

  const userT = (key: string, params: Record<string, string | number> = {}): string => {
    const keys = key.split('.');
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
        return key;
      }
    }

    if (typeof translation === 'string' && params) {
      Object.keys(params).forEach((param) => {
        translation = translation.replace(new RegExp(`{${param}}`, 'g'), String(params[param]));
      });
    }

    return typeof translation === 'string' ? translation : key;
  };

  return (
    <UserLanguageContext.Provider
      value={{
        currentUserLanguage,
        changeUserLanguage,
        userT,
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
