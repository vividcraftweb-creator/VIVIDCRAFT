'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'si' : 'en')}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
      aria-label={`Switch language to ${language === 'en' ? 'Sinhala' : 'English'}`}
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{language === 'en' ? 'සිං' : 'EN'}</span>
    </button>
  );
}
