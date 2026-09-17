'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DEFAULT_WHATSAPP_NUMBER } from '@/lib/whatsapp';

interface LanguageMessage {
  lang: string;
  label: string;
  text: string;
}

const TOOLTIP_MESSAGES: LanguageMessage[] = [
  {
    lang: 'si',
    label: 'සිංහල',
    text: 'ඔබට අවශ්ය ඕනෑම කටයුත්තක් සඳහා මෙම WhatsApp බටනය ක්ලික් කර තොරතුරු ලබාගන්න',
  },
  {
    lang: 'en',
    label: 'English',
    text: 'Click this WhatsApp button for any information or support you need',
  },
  {
    lang: 'ta',
    label: 'தமிழ்',
    text: 'உங்களுக்கு தேவையான எந்தவொரு தகவலுக்கும் இந்த WhatsApp பொத்தானை கிளிக் செய்யவும்',
  },
];

export interface WhatsAppFloatProps {
  phoneNumber?: string;
  message?: string;
}

export function WhatsAppFloat({
  phoneNumber,
  message = 'Hi, I want to know',
}: WhatsAppFloatProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rotate language tooltip every 3.5 seconds
  useEffect(() => {
    if (isDismissed) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % TOOLTIP_MESSAGES.length);
        setIsFading(false);
      }, 250);
    }, 3500);

    return () => clearInterval(interval);
  }, [isDismissed]);

  if (!mounted) return null;

  const rawPhone = phoneNumber || process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || DEFAULT_WHATSAPP_NUMBER;
  const cleanPhone = String(rawPhone).replace(/\D/g, '') || '94783813833';
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  const currentMsg = TOOLTIP_MESSAGES[currentIndex];

  return (
    <div
      aria-label="WhatsApp Support Floating Widget"
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 flex items-end sm:items-center gap-2.5 pointer-events-auto select-none group"
    >
      {/* Animated Multi-Language Tooltip Bubble */}
      {!isDismissed && (
        <div
          role="tooltip"
          className="relative max-w-[250px] sm:max-w-[300px] p-3 pr-7 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-black/15 text-slate-800 dark:text-slate-100 transition-all duration-300 animate-in fade-in slide-in-from-right-4"
        >
          {/* Dismiss button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            aria-label="Dismiss message"
            className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Language indicator badge */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {currentMsg.label}
            </span>
          </div>

          {/* Rotating Text with smooth fade transition */}
          <p
            className={`text-xs leading-relaxed font-medium transition-opacity duration-200 ${
              isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            {currentMsg.text}
          </p>

          {/* Triangle arrow pointer towards the WhatsApp button */}
          <div className="hidden sm:block absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white/95 dark:bg-slate-900/95 border-t border-r border-slate-200/90 dark:border-slate-800 rotate-45 pointer-events-none" />
        </div>
      )}

      {/* Floating WhatsApp Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white shadow-xl shadow-emerald-600/35 hover:shadow-emerald-600/50 hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/40 cursor-pointer shrink-0"
      >
        {/* Subtle breathing glow ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping -z-10" />

        {/* WhatsApp Official Icon SVG */}
        <svg
          className="w-8 h-8 sm:w-9 sm:h-9 fill-current filter drop-shadow"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      </a>
    </div>
  );
}

export default WhatsAppFloat;
