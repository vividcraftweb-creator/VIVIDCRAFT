import { appRouter } from './router';
import { createContext } from './context';

// This is the tRPC v11 way to create a server-side caller
export const serverClient = appRouter.createCaller(await createContext());
