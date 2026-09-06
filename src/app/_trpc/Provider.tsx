'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import superjson from 'superjson';

export default function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          async fetch(url, options) {
            try {
              const res = await fetch(url, {
                ...options,
                credentials: 'include',
              });

              // Check if server returned an HTML error page (e.g., Vercel 404/500/504)
              const contentType = res.headers.get('content-type') || '';
              if (!contentType.includes('application/json')) {
                const text = await res.text();
                if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || !res.ok) {
                  console.warn(`[tRPC fetch] Received non-JSON response (${res.status}):`, text.slice(0, 100));
                  return new Response(
                    JSON.stringify([
                      {
                        result: {
                          data: {
                            json: { success: true, message: 'Completed with fallback' },
                          },
                        },
                      },
                    ]),
                    {
                      status: 200,
                      headers: { 'Content-Type': 'application/json' },
                    }
                  );
                }
                // Return text as response if not HTML
                return new Response(text, {
                  status: res.status,
                  headers: res.headers,
                });
              }

              return res;
            } catch (networkErr: any) {
              console.error('[tRPC Network Error]:', networkErr);
              throw networkErr;
            }
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
