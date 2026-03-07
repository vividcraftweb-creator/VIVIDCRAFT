'use client';

import { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
  session?: unknown;
}

export default function SessionProvider({ children }: SessionProviderProps) {
  // Supabase Auth doesn't need a provider wrapper
  // Session is handled via server-side cookies
  return <>{children}</>;
}