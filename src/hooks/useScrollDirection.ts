'use client';

import { useState, useEffect } from 'react';

type ScrollDirection = 'up' | 'down' | null;

export function useScrollDirection(threshold: number = 10) {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      // Always show at top of page
      if (scrollY < threshold) {
        setVisible(true);
        setScrollDirection(null);
      } else {
        const direction = scrollY > lastScrollY ? 'down' : 'up';

        if (direction !== scrollDirection &&
            Math.abs(scrollY - lastScrollY) > threshold) {
          setScrollDirection(direction);
          setVisible(direction === 'up');
        }
      }

      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollDirection, threshold]);

  return { scrollDirection, visible };
}
