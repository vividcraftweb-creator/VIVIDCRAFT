'use client';

import { useEffect, useRef } from 'react';

export function useNotificationTitle(unreadCount: number) {
  // Store the original page title from Next.js metadata
  const originalTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Capture the original title on first mount (from Next.js SSR/metadata)
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title || 'JobHorizons';
    }

    const originalTitle = originalTitleRef.current;

    // Update title based on notification count
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle}`;
    } else {
      // Restore original title when no unread notifications
      document.title = originalTitle;
    }

    // Cleanup: restore original title on unmount
    return () => {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, [unreadCount]);
}
