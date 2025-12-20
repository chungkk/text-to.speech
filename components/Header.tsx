'use client';

import Link from 'next/link';
import { Language } from '@/lib/translations';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const languages = [
  { code: 'de' as Language, name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  { code: 'vi' as Language, name: 'Tiếng Việt', flag: '🇻🇳' },
];

export default function Header({ currentLang, onLanguageChange }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-md">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>ElevenLabs TTS</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-normal">v2.0</span>
              </h1>
              <p className="text-blue-100 text-sm">Powered by ElevenLabs AI</p>
            </div>
          </div>

          {/* Navigation Links, Language Switcher & Admin Link */}
          <div className="flex items-center gap-4">
            {/* Navigation Links */}
            <nav className="flex items-center gap-2">
              <Link
                href="/longleng"
                className="px-4 py-2 text-white hover:bg-white/20 rounded-lg transition-all font-semibold bg-white/10 border border-white/30 hover:border-white/50 shadow-sm"
              >
                🎬 Longleng
              </Link>
            </nav>

            {/* Language Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all backdrop-blur-sm border border-white/20 hover:border-white/40">
                <span className="text-xl">
                  {languages.find(l => l.code === currentLang)?.flag}
                </span>
                <span className="hidden sm:inline font-medium">
                  {languages.find(l => l.code === currentLang)?.name}
                </span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 -translate-y-2">
                <div className="py-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => onLanguageChange(lang.code)}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-3 ${
                        currentLang === lang.code ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span>{lang.name}</span>
                      {currentLang === lang.code && (
                        <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin Link */}
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-semibold shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
