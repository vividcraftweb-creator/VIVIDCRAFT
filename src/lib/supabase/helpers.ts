/**
 * Supabase Query Helper Utilities
 * Provides type-safe, reusable query functions for common database operations
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { Database, TablesInsert, TablesUpdate } from '@/types/database.types';

type TableName = keyof Database['public']['Tables'];

/**
 * Generic helper to get records from a table
 */
export async function getRecords<T extends TableName>(
  table: T,
  options?: {
    filter?: Record<string, unknown>;
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) {
  const supabase = await createClient();

  let query = supabase.from(table).select(options?.select || '*');

  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true
    });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query;
}

/**
 * Get a single record by ID
 */
export async function getRecordById<T extends TableName>(
  table: T,
  id: string,
  select?: string
) {
  const supabase = await createClient();
  return supabase
    .from(table)
    .select(select || '*')
    .eq('id', id)
    .single();
}

/**
 * Create a new record
 */
export async function createRecord<T extends TableName>(
  table: T,
  data: TablesInsert<T>
) {
  const supabase = await createClient();
  return supabase
    .from(table)
    .insert(data)
    .select()
    .single();
}

/**
 * Update a record by ID
 */
export async function updateRecord<T extends TableName>(
  table: T,
  id: string,
  data: TablesUpdate<T>
) {
  const supabase = await createClient();
  return supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/**
 * Delete a record by ID
 */
export async function deleteRecord<T extends TableName>(
  table: T,
  id: string
) {
  const supabase = await createClient();
  return supabase
    .from(table)
    .delete()
    .eq('id', id);
}

/**
 * Count records in a table
 */
export async function countRecords<T extends TableName>(
  table: T,
  filter?: Record<string, unknown>
) {
  const supabase = await createClient();

  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  return query;
}

/**
 * Get current authenticated user from Supabase Auth
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get current user's full profile (User + Profile joined)
 */
export async function getCurrentUserProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('User')
    .select(`
      *,
      Profile (*)
    `)
    .eq('id', user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Browser-side helpers for client components
 */
export const browserHelpers = {
  async getRecords<T extends TableName>(
    table: T,
    options?: {
      filter?: Record<string, unknown>;
      select?: string;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ) {
    const supabase = createBrowserClient();

    let query = supabase.from(table).select(options?.select || '*');

    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query;
  },

  async createRecord<T extends TableName>(
    table: T,
    data: TablesInsert<T>
  ) {
    const supabase = createBrowserClient();
    return supabase
      .from(table)
      .insert(data)
      .select()
      .single();
  },

  async updateRecord<T extends TableName>(
    table: T,
    id: string,
    data: TablesUpdate<T>
  ) {
    const supabase = createBrowserClient();
    return supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteRecord<T extends TableName>(
    table: T,
    id: string
  ) {
    const supabase = createBrowserClient();
    return supabase
      .from(table)
      .delete()
      .eq('id', id);
  }
};
