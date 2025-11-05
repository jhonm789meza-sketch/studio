// src/hooks/use-language.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import es from '@/lib/locales/es.json';
import en from '@/lib/locales/en.json';

const languages = { es, en };

type Language = keyof typeof languages;

export const useLanguage = () => {
  const [language, setLanguage] = useState<Language>('es');

  useEffect(() => {
    // You could persist the language in localStorage
    const savedLanguage = localStorage.getItem('raffle-language') as Language;
    if (savedLanguage && languages[savedLanguage]) {
      setLanguage(savedLanguage);
    }
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === 'es' ? 'en' : 'es';
    setLanguage(newLanguage);
    localStorage.setItem('raffle-language', newLanguage);
  };

  const t = useCallback((key: string, params: Record<string, any> = {}) => {
    const keys = key.split('.');
    let result: any = languages[language];
    
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found
        let fallbackResult: any = languages.en;
        for (const fk of keys) {
            fallbackResult = fallbackResult?.[fk];
        }
        if (fallbackResult === undefined) {
            return key; // Return the key if not found in either language
        }
        result = fallbackResult;
        break;
      }
    }

    if (typeof result === 'string') {
        Object.keys(params).forEach(paramKey => {
            result = result.replace(`{${paramKey}}`, params[paramKey]);
        });
    }

    return result || key;
  }, [language]);

  return { language, toggleLanguage, t };
};
