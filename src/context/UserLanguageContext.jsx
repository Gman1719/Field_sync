import React, { createContext, useState, useContext, useEffect } from 'react';
import i18n, { userLanguages, defaultUserLanguage } from '../locales/index';

const UserLanguageContext = createContext();

export const UserLanguageProvider = ({ children }) => {
  const [currentUserLanguage, setCurrentUserLanguage] = useState(() => {
    const savedLang = localStorage.getItem('user-app-language') || localStorage.getItem('i18nextLng');
    const normalized = savedLang ? savedLang.split('-')[0] : null;
    if (normalized && userLanguages[normalized]) {
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

  const changeUserLanguage = (langCode) => {
    if (userLanguages[langCode]) {
      setCurrentUserLanguage(langCode);
      i18n.changeLanguage(langCode);
    }
  };

  const userT = (key, params = {}) => {
    const keys = key.split('.');
    let translation = userLanguages[currentUserLanguage]?.translations;
    
    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        // Fallback to English
        let fallback = userLanguages['en']?.translations;
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
      Object.keys(params).forEach(param => {
        translation = translation.replace(new RegExp(`{${param}}`, 'g'), params[param]);
      });
    }
    
    return translation || key;
  };

  return (
    <UserLanguageContext.Provider value={{ 
      currentUserLanguage, 
      changeUserLanguage, 
      userT, 
      userLanguages 
    }}>
      {children}
    </UserLanguageContext.Provider>
  );
};

export const useUserLanguage = () => {
  const context = useContext(UserLanguageContext);
  if (!context) {
    throw new Error('useUserLanguage must be used within a UserLanguageProvider');
  }
  return context;
};

export default UserLanguageContext;