import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  applyThemePreference,
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '../lib/theme';
import { SegmentedControl } from './Tabs';

const OPTIONS = [
  { value: 'light', label: <Sun aria-hidden="true" />, ariaLabel: 'Light theme' },
  { value: 'dark', label: <Moon aria-hidden="true" />, ariaLabel: 'Dark theme' },
  { value: 'system', label: <Monitor aria-hidden="true" />, ariaLabel: 'Use system theme' },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);

  // In system mode, follow the device when it changes, such as at sunset.
  useEffect(() => {
    if (theme !== 'system') return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const follow = () => {
      applyThemePreference('system');
    };
    media.addEventListener('change', follow);
    return () => {
      media.removeEventListener('change', follow);
    };
  }, [theme]);

  return (
    <SegmentedControl
      label="Theme"
      options={OPTIONS}
      value={theme}
      className={className}
      onValueChange={(next) => {
        setThemePreference(next);
        setTheme(next);
      }}
    />
  );
}
