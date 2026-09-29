import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
    { code: 'om', name: 'Oromoo', flag: '🇪🇹' },
    { code: 'ti', name: 'ትግርኛ', flag: '🇪🇹' },
  ];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  return (
    <div className="language-selector">
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="language-select bg-transparent text-sm py-1 px-2 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="dark:bg-slate-800">
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
