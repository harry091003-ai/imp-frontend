import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getThemePreference, setThemePreference, THEME_STORAGE_KEY } from './theme';

function systemPrefersDark(dark: boolean): void {
  vi.stubGlobal('matchMedia', () => ({ matches: dark }));
}

describe('theme preference', () => {
  beforeEach(() => {
    localStorage.clear();
    systemPrefersDark(false);
  });

  it('defaults to the system setting', () => {
    expect(getThemePreference()).toBe('system');
  });

  it('saves and applies an explicit choice', () => {
    setThemePreference('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(getThemePreference()).toBe('dark');
  });

  it('follows the system when set back to system', () => {
    setThemePreference('light');
    systemPrefersDark(true);
    setThemePreference('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('ignores a tampered saved value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, '<script>');
    expect(getThemePreference()).toBe('system');
  });
});
