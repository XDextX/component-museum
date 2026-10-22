import { useSyncExternalStore, type ReactNode } from 'react';

export type Language = 'es' | 'en';

const KEY = 'museum:lang';
const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

/** The language to start in: the saved one if it is Spanish or English, else Spanish (spec 005, RF-5). */
export function initialLanguage(saved: string | null): Language {
  return saved === 'es' || saved === 'en' ? saved : 'es';
}

function saved(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // No localStorage (private mode, blocked storage): stay in Spanish and save nothing.
    return null;
  }
}

// One module-level store, so the switch and every <Lang> agree without a provider around the MDX.
let current: Language | undefined;
const listeners = new Set<() => void>();
const read = (): Language => (current ??= initialLanguage(saved()));
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function choose(language: Language): void {
  current = language;
  try {
    localStorage.setItem(KEY, language);
  } catch {
    // Not saved: the choice still holds for this page.
  }
  listeners.forEach((listener) => listener());
}

function useLanguage(): Language {
  return useSyncExternalStore(subscribe, read, () => 'es');
}

/** «Español | English»: two toggle buttons, the chosen one pressed (spec 005, RF-1). */
export function LanguageSwitch() {
  const language = useLanguage();
  return (
    <div role="group" aria-label="Idioma · Language" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {LANGUAGES.map(({ code, label }, i) => (
        <span key={code} style={{ display: 'contents' }}>
          {i > 0 && <span aria-hidden="true">|</span>}
          <button type="button" lang={code} aria-pressed={language === code} onClick={() => choose(code)}>
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}

/** Renders its children only while `lang` is the chosen language. */
export function Lang({ lang, children }: { lang: Language; children: ReactNode }) {
  return useLanguage() === lang ? <div lang={lang}>{children}</div> : null;
}
