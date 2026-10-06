import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import i18n, { userLanguages, defaultUserLanguage } from '../locales/index';

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
    return i18n.language ? i18n.language.split('-')[0] : defaultUserLanguage;
  });

  useEffect(() => {
    localStorage.setItem('user-app-language', currentUserLanguage);
    localStorage.setItem('i18nextLng', currentUserLanguage);
    document.documentElement.lang = currentUserLanguage;
    if (i18n.language !== currentUserLanguage) {
      i18n.changeLanguage(currentUserLanguage);
    }
  }, [currentUserLanguage]);

  // Synchronize state if i18n language is changed externally
  useEffect(() => {
    const onLanguageChanged = (lng: string) => {
      const code = lng ? lng.split('-')[0] : 'en';
      if (code !== currentUserLanguage && (userLanguages as Record<string, any>)[code]) {
        setCurrentUserLanguage(code);
      }
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => {
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, [currentUserLanguage]);

  const changeUserLanguage = (langCode: string) => {
    if ((userLanguages as Record<string, any>)[langCode]) {
      setCurrentUserLanguage(langCode);
      i18n.changeLanguage(langCode);
      localStorage.setItem('user-app-language', langCode);
      localStorage.setItem('i18nextLng', langCode);
      document.documentElement.lang = langCode;
    }
  };

  const userT = (keyOrText: string, params: Record<string, string | number> = {}): string => {
    if (!keyOrText) return '';
    // Query i18next engine with default fallback
    const res = i18n.t(keyOrText, { defaultValue: keyOrText, ...params });
    return res || keyOrText;
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
