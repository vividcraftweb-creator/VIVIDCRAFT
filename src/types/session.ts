import type { Role } from '@/types/database.types';

export interface AppSessionUser {
  id: string;
  role: Role | string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  avatar_url?: string | null;
  user_metadata?: {
    firstName?: string;
    lastName?: string;
    role?: string;
  };
}

export interface AppSession {
  user: AppSessionUser;
  expires: string;
}
