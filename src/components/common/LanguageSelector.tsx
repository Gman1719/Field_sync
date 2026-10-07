import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useUserLanguage } from '../../context/UserLanguageContext';

interface LanguageSelectorProps {
  className?: string;
  buttonClassName?: string;
  dropdownAlign?: 'left' | 'right';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  buttonClassName = '',
  dropdownAlign = 'right',
}) => {
  const { currentUserLanguage, changeUserLanguage, userLanguages, userT } = useUserLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Language"
        className={
          buttonClassName ||
          'p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer'
        }
        title="Change Language"
      >
        <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="uppercase">{currentUserLanguage || 'en'}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute ${dropdownAlign === 'right' ? 'right-0' : 'left-0'} mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 z-[100] animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/10`}
        >
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/80">
            {userT ? userT('Select Language') : 'SELECT LANGUAGE'}
          </div>
          {Object.entries((userLanguages as Record<string, any>) || {}).map(([code, lang]: [string, any]) => {
            const isSelected = currentUserLanguage === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  changeUserLanguage(code);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-[#2563EB] dark:text-blue-400 font-bold bg-blue-50/70 dark:bg-blue-950/40'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="font-bold text-[11px] tracking-wider text-slate-400 dark:text-slate-400 w-5">
                    {lang.countryCode || (code === 'en' ? 'GB' : 'ET')}
                  </span>
                  <span>{lang.nativeName}</span>
                </span>
                {isSelected && (
                  <Check className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
