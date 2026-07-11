import ptBR from './pt-BR';
import en from './en';

export type Locale = 'pt-BR' | 'en';
export type Messages = typeof ptBR;

export function normalizeLocale(value?: string): Locale {
  return value === 'en' ? 'en' : 'pt-BR';
}

export function getMessages(locale: Locale): Messages {
  return locale === 'en' ? (en as unknown as Messages) : ptBR;
}
