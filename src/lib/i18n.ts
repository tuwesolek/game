// Simple internationalization system for en/pl support

type Language = 'en' | 'pl';

interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  en: {
    'game.title': 'Pixel Dominion',
    'game.loading': 'Loading...',
    'resources.px': 'PX',
    'resources.exp': 'EXP', 
    'resources.apx': 'APX',
    'tools.territory': 'Territory',
    'tools.building': 'Building',
    'tools.apx': 'APX Attack',
    'tools.inspect': 'Inspect',
    'ui.online': 'players online',
    'ui.leaderboard': 'Leaderboard',
    'ui.board': 'Board'
  },
  pl: {
    'game.title': 'Dominacja Pikseli',
    'game.loading': 'Ładowanie...',
    'resources.px': 'PX',
    'resources.exp': 'DOŚ',
    'resources.apx': 'APX',
    'tools.territory': 'Terytorium',
    'tools.building': 'Budynek',
    'tools.apx': 'Atak APX',
    'tools.inspect': 'Inspekcja',
    'ui.online': 'graczy online',
    'ui.leaderboard': 'Ranking',
    'ui.board': 'Tablica'
  }
};

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  return translations[currentLanguage][key] || key;
}

// Auto-detect browser language
export function initializeLanguage(): void {
  const browserLang = navigator.language.split('-')[0] as Language;
  if (translations[browserLang]) {
    currentLanguage = browserLang;
  }
}