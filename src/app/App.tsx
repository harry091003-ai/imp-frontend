import { useState } from 'react';
import {
  getThemePreference,
  setThemePreference,
  THEME_PREFERENCES,
  type ThemePreference,
} from '@/shared/lib/theme';

// Phase 1 placeholder: proves the build, fonts, tokens and theme work. Phase 3 replaces it.
export function App() {
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold text-ink">IMP Incident Platform</h1>
      <p className="text-ink2">Phase 1 foundation is running. Screens start in Phase 3.</p>
      <fieldset className="flex flex-wrap gap-2 rounded-lg border border-line bg-surface p-4 shadow-card">
        <legend className="px-1 text-sm text-ink3">Theme</legend>
        {THEME_PREFERENCES.map((option) => (
          <label
            key={option}
            className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-ink capitalize"
          >
            <input
              type="radio"
              name="theme"
              checked={theme === option}
              onChange={() => {
                setThemePreference(option);
                setTheme(option);
              }}
            />
            {option}
          </label>
        ))}
      </fieldset>
    </main>
  );
}
