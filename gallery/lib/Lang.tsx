import { useTheme, type StorybookTheme } from 'storybook/theming';
import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';

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

// Spec 007, RF-2/RF-3: the font is the page's; the text colour is the docs theme's (the page body sets none, so
// `inherit` would stay black on the dark page). The pressed button gets a translucent grey fill, which stays distinct and readable on a light or a dark page.
const buttonStyle = (pressed: boolean, color: string): CSSProperties => ({
  font: 'inherit',
  color,
  background: pressed ? 'rgba(128, 128, 128, 0.25)' : 'transparent',
  border: '1px solid currentColor',
  borderRadius: '4px',
  padding: '0.25rem 0.75rem',
  cursor: 'pointer',
});

/** «Español | English»: two toggle buttons, the chosen one pressed (spec 005, RF-1). */
export function LanguageSwitch() {
  const language = useLanguage();
  // Storybook types Theme by augmenting it, which the root tsconfig (NodeNext) does not apply.
  const color = (useTheme() as StorybookTheme).color?.defaultText ?? 'inherit';
  return (
    <div role="group" aria-label="Idioma · Language" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {LANGUAGES.map(({ code, label }, i) => (
        <span key={code} style={{ display: 'contents' }}>
          {i > 0 && <span aria-hidden="true" style={{ color }}>|</span>}
          <button type="button" lang={code} aria-pressed={language === code} style={buttonStyle(language === code, color)} onClick={() => choose(code)}>
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
