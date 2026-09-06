import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/router';
import { createContext } from '@/server/trpc/context';

const handler = async (req: Request) => {
  try {
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext,
      onError({ error, path }) {
        console.error(`[tRPC Error] ${path || 'unknown'}:`, error);
      },
    });
  } catch (error: any) {
    console.error('[tRPC Fatal Error Caught]:', error);
    return new Response(
      JSON.stringify([
        {
          error: {
            message: error?.message || 'Internal server error occurred.',
            code: -32603,
            data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 },
          },
        },
      ]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export { handler as GET, handler as POST };
