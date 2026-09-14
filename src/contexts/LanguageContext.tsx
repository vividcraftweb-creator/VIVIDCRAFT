'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, type Language, type TranslationKey } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

function setGoogleTranslateCookie(targetLang: 'en' | 'si') {
  if (typeof document === 'undefined') return;
  const cookieVal = `/en/${targetLang}`;
  const host = window.location.hostname;

  document.cookie = `googtrans=${cookieVal}; path=/`;
  document.cookie = `googtrans=${cookieVal}; path=/; domain=${host}`;

  const domainParts = host.split('.');
  if (domainParts.length > 1 && !host.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
    const rootDomain = '.' + domainParts.slice(-2).join('.');
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${rootDomain}`;
  }
}

function clearGoogleTranslateCookie() {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  document.cookie = `googtrans=; ${expired}`;
  document.cookie = `googtrans=; ${expired} domain=${host};`;

  const domainParts = host.split('.');
  if (domainParts.length > 1 && !host.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
    const rootDomain = '.' + domainParts.slice(-2).join('.');
    document.cookie = `googtrans=; ${expired} domain=${rootDomain};`;
  }
}

function triggerGoogleTranslateCombo(lang: 'en' | 'si') {
  if (typeof document === 'undefined') return false;
  try {
    const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event('change'));
      return true;
    }
  } catch {}
  return false;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Initialize from googtrans cookie or local storage on client mount
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cookie = document.cookie;
    if (cookie.includes('googtrans=/en/si')) {
      setLanguageState('si');
    } else if (cookie.includes('googtrans=/en/en')) {
      setLanguageState('en');
    } else {
      const stored = localStorage.getItem('vivid-art-language') as Language | null;
      if (stored === 'si' || stored === 'en') {
        setLanguageState(stored);
      }
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('vivid-art-language', lang);

    if (lang === 'si') {
      setGoogleTranslateCookie('si');
    } else {
      setGoogleTranslateCookie('en');
      clearGoogleTranslateCookie();
    }
    triggerGoogleTranslateCombo(lang);

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const nextLang: Language = language === 'en' ? 'si' : 'en';
    setLanguageState(nextLang);
    localStorage.setItem('vivid-art-language', nextLang);

    if (nextLang === 'si') {
      setGoogleTranslateCookie('si');
    } else {
      setGoogleTranslateCookie('en');
      clearGoogleTranslateCookie();
    }
    triggerGoogleTranslateCombo(nextLang);

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [language]);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] || translations.en[key] || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
