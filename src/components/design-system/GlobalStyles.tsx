import { useEffect } from 'react';
import { useAppStore } from '../../stores/app.store';
import './tokens.css';

export function GlobalStyles() {
  const { isDarkMode, setDarkMode } = useAppStore();

  // Sync DOM data-theme attribute whenever store isDarkMode changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Sync OS native theme changes on initial load & OS events
  useEffect(() => {
    if (window.link?.theme?.onThemeChanged) {
      const cleanup = window.link.theme.onThemeChanged((isDark) => {
        setDarkMode(isDark);
      });
      return cleanup;
    } else {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setDarkMode(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setDarkMode(e.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [setDarkMode]);

  return null;
}
