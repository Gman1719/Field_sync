import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSelector() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
    { code: 'om', name: 'Oromoo', flag: '🇪🇹' },
    { code: 'ti', name: 'ትግርኛ', flag: '🇪🇹' }
  ];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  return (
    <div className="language-selector">
      <select 
        value={i18n.language} 
        onChange={(e) => changeLanguage(e.target.value)}
        className="language-select"
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelector;