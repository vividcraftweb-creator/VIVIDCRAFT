'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors text-xs font-medium cursor-pointer shadow-sm border border-slate-200/60 dark:border-white/10"
      aria-label={`Switch language to ${language === 'en' ? 'Sinhala' : 'English'}`}
      title={language === 'en' ? 'Translate to Sinhala (සිංහල)' : 'Switch back to English'}
    >
      <Globe className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
      <span className="font-semibold">{language === 'en' ? 'සිං' : 'EN'}</span>
    </button>
  );
}
