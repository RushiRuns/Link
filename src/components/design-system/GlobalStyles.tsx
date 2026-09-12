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

  // Auto-hide scrollbar when not actively scrolling
  useEffect(() => {
    const scrollTimeouts = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

    const handleScroll = (e: Event) => {
      const target = e.target;
      const element = target instanceof HTMLElement ? target : (target === document ? document.documentElement : null);
      if (!element) return;

      element.classList.add('is-scrolling');

      const existing = scrollTimeouts.get(element);
      if (existing) {
        clearTimeout(existing);
      }

      const timeout = setTimeout(() => {
        element.classList.remove('is-scrolling');
        scrollTimeouts.delete(element);
      }, 1000);

      scrollTimeouts.set(element, timeout);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  return null;
}

