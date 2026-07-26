import { useEffect } from 'react';
import './tokens.css';

export function GlobalStyles() {
  useEffect(() => {
    // Bind to nativeTheme IPC if available
    if (window.link?.theme?.onThemeChanged) {
      const cleanup = window.link.theme.onThemeChanged((isDark) => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      });
      return cleanup;
    } else {
      // Fallback to media query listener in browser mode
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  return null;
}
