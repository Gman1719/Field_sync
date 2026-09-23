import React, { useState, useRef, useEffect } from 'react';
import { useUserLanguage } from '../../context/UserLanguageContext';

const UserLanguageSelector = () => {
  const { currentUserLanguage, changeUserLanguage, userLanguages } = useUserLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = userLanguages[currentUserLanguage];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#0b7e4b';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(11, 126, 75, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <span style={{ fontSize: '20px' }}>
          {currentUserLanguage === 'en' ? '🇬🇧' : '🇪🇹'}
        </span>
        <span>{currentLang?.nativeName || 'English'}</span>
        <span style={{ fontSize: '12px', marginLeft: '4px' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '200px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            zIndex: 1000
          }}
        >
          {Object.entries(userLanguages).map(([code, lang]) => (
            <button
              key={code}
              onClick={() => {
                changeUserLanguage(code);
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: currentUserLanguage === code ? '#f0fdf4' : 'white',
                cursor: 'pointer',
                fontSize: '14px',
                color: currentUserLanguage === code ? '#0b7e4b' : '#374151',
                transition: 'all 0.15s',
                borderBottom: '1px solid #f3f4f6'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = currentUserLanguage === code ? '#f0fdf4' : 'white';
              }}
            >
              <span style={{ fontSize: '20px' }}>
                {code === 'en' ? '🇬🇧' : '🇪🇹'}
              </span>
              <span style={{ fontWeight: currentUserLanguage === code ? '600' : '400' }}>
                {lang.nativeName}
              </span>
              {currentUserLanguage === code && (
                <span style={{ marginLeft: 'auto', color: '#0b7e4b' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserLanguageSelector;