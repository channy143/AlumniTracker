import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global Scroll Restoration & Reset Controller
 * Guarantees that every page in both Admin and Alumni portals starts
 * at the very top (0, 0) upon navigation, eliminating leftover scroll
 * positions from previously visited pages.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Disable browser's automatic and inaccurate scroll restoration in SPAs
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    const scrollToTop = () => {
      // Temporarily bypass smooth scrolling on <html> to force an immediate, crisp jump to top
      const root = document.documentElement;
      const prevBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';

      window.scrollTo(0, 0);
      root.scrollTop = 0;
      document.body.scrollTop = 0;

      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;

      root.style.scrollBehavior = prevBehavior;
    };

    // 1. Immediate synchronous reset before paint
    scrollToTop();

    // 2. Next animation frame & microtask to catch elements rendered after route mounts
    const rafId = requestAnimationFrame(scrollToTop);
    const timer = setTimeout(scrollToTop, 16);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}

