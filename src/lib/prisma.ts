/**
 * Prisma-to-Supabase Compatibility Layer
 *
 * This file provides a `prisma` object that mimics Prisma's API while using Supabase under the hood.
 * It allows legacy code written for Prisma to work without major refactoring.
 *
 * NOTE: This is a simplified compatibility layer and may not support all Prisma features.
 * For new code, use the Supabase client directly from @/lib/supabase/server or @/lib/supabase/client
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];

// Helper to convert Supabase error to Prisma-style error
class PrismaCompatError extends Error {
  code: string;

  constructor(message: string, code: string = 'P2002') {
    super(message);
    this.name = 'PrismaCompatError';
    this.code = code;
  }
}

// Generic type for table operations
type TableRow<T extends keyof Tables> = Tables[T]['Row'];
type TableInsert<T extends keyof Tables> = Tables[T]['Insert'];
type TableUpdate<T extends keyof Tables> = Tables[T]['Update'];

type ComparisonOperators<T> = {
  not?: T;
  in?: T[];
  gt?: T;
  lt?: T;
  gte?: T;
  lte?: T;
  contains?: string;
  some?: unknown;
};

type WhereValue<T> = T | ComparisonOperators<T>;

type WhereClause<TTable extends keyof Tables> = Partial<{
  [K in keyof TableRow<TTable>]: WhereValue<TableRow<TTable>[K]>;
}>;

type OrderByClause<TTable extends keyof Tables> = Partial<
  Record<keyof TableRow<TTable>, 'asc' | 'desc'>
>;

interface FindUniqueArgs<TTable extends keyof Tables> {
  where: WhereClause<TTable>;
  include?: unknown;
  select?: unknown;
}

interface FindManyArgs<TTable extends keyof Tables> {
  where?: WhereClause<TTable>;
  include?: unknown;
  select?: unknown;
  take?: number;
  orderBy?: OrderByClause<TTable>;
}

type FindFirstArgs<TTable extends keyof Tables> = FindManyArgs<TTable>;

interface CreateArgs<TTable extends keyof Tables> {
  data: TableInsert<TTable>;
  include?: unknown;
  select?: unknown;
}

interface UpdateArgs<TTable extends keyof Tables> {
  where: WhereClause<TTable>;
  data: TableUpdate<TTable>;
  include?: unknown;
  select?: unknown;
}

interface DeleteArgs<TTable extends keyof Tables> {
  where: WhereClause<TTable>;
}

interface UpdateManyArgs<TTable extends keyof Tables> {
  where?: WhereClause<TTable>;
  data: TableUpdate<TTable>;
}

interface DeleteManyArgs<TTable extends keyof Tables> {
  where?: WhereClause<TTable>;
}

interface CountArgs<TTable extends keyof Tables> {
  where?: WhereClause<TTable>;
}

interface UpsertArgs<TTable extends keyof Tables> {
  where: WhereClause<TTable>;
  create: TableInsert<TTable>;
  update: TableUpdate<TTable>;
}

interface PrismaTableAccessor<TTable extends keyof Tables> {
  findUnique(args: FindUniqueArgs<TTable>): Promise<TableRow<TTable> | null>;
  findMany(args?: FindManyArgs<TTable>): Promise<TableRow<TTable>[]>;
  findFirst(args: FindFirstArgs<TTable>): Promise<TableRow<TTable> | null>;
  create(args: CreateArgs<TTable>): Promise<TableRow<TTable>>;
  update(args: UpdateArgs<TTable>): Promise<TableRow<TTable>>;
  updateMany(args: UpdateManyArgs<TTable>): Promise<{ count: number }>;
  delete(args: DeleteArgs<TTable>): Promise<TableRow<TTable>>;
  deleteMany(args: DeleteManyArgs<TTable>): Promise<{ count: number }>;
  count(args?: CountArgs<TTable>): Promise<number>;
  upsert(args: UpsertArgs<TTable>): Promise<TableRow<TTable>>;
}

function isComparisonObject(value: unknown): value is ComparisonOperators<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'not' in value ||
    'in' in value ||
    'gt' in value ||
    'lt' in value ||
    'gte' in value ||
    'lte' in value ||
    'contains' in value ||
    'some' in value
  );
}

function getTargetTableName(tableName: string): string {
  const lower = String(tableName).toLowerCase();
  if (lower === 'user' || lower === 'users') return 'users';
  if (lower === 'profile' || lower === 'profiles') return 'profiles';
  return tableName;
}

/**
 * Creates a table accessor that mimics Prisma's table API
 */
function createTableAccessor<TTable extends keyof Tables>(tableName: TTable): PrismaTableAccessor<TTable> {
  const targetTable = getTargetTableName(tableName as string);
  const altTable = targetTable === 'users' ? 'User' : targetTable === 'profiles' ? 'Profile' : tableName as string;

  return {
    async findUnique({ where }: FindUniqueArgs<TTable>): Promise<TableRow<TTable> | null> {
      const supabase = createAdminClient();
      const [whereKey, whereValue] = Object.entries(where)[0] as [string, WhereValue<unknown>];

      if (isComparisonObject(whereValue)) {
        throw new PrismaCompatError('Complex where clauses are not supported for findUnique', 'P2025');
      }

      let res = await supabase.from(targetTable).select('*').eq(whereKey, whereValue).maybeSingle();
      if (res.error && (res.error.message?.includes('schema cache') || res.error.code === 'PGRST205')) {
        res = await supabase.from(altTable).select('*').eq(whereKey, whereValue).maybeSingle();
      }

      if (res.error) {
        if (res.error.code === 'PGRST116') return null; // Not found
        throw new PrismaCompatError(res.error.message, 'P2001');
      }

      return res.data;
    },

    async findMany({ where, take, orderBy }: FindManyArgs<TTable> = {}): Promise<TableRow<TTable>[]> {
      const supabase = createAdminClient();
      let query = supabase.from(targetTable).select('*');

      if (where) {
        for (const [key, value] of Object.entries(where)) {
          if (isComparisonObject(value)) {
            if (value.not !== undefined) {
              query = query.neq(key, value.not as string | number | boolean | null);
            }
            if (value.gte !== undefined) {
              query = query.gte(key, value.gte as string | number);
            }
            if (value.lte !== undefined) {
              query = query.lte(key, value.lte as string | number);
            }
            if (value.gt !== undefined) {
              query = query.gt(key, value.gt as string | number);
            }
            if (value.lt !== undefined) {
              query = query.lt(key, value.lt as string | number);
            }
            if (Array.isArray(value.in)) {
              query = query.in(key, value.in);
            }
            if (typeof value.contains === 'string') {
              query = query.ilike(key, `%${value.contains}%`);
            }
            // Relation filters like `some` are currently not supported in this compatibility layer.
          } else if (value !== undefined) {
            query = query.eq(key, value);
          }
        }
      }

      if (take) {
        query = query.limit(take);
      }

      if (orderBy) {
        const [orderKey, orderDirection] = Object.entries(orderBy)[0] as [string, 'asc' | 'desc'];
        query = query.order(orderKey, { ascending: orderDirection !== 'desc' });
      }

      const { data, error } = await query;

      if (error) {
        throw new PrismaCompatError(error.message, 'P2002');
      }

      return data || [];
    },

    async findFirst({ where, orderBy }: FindFirstArgs<TTable>): Promise<TableRow<TTable> | null> {
      const results = await this.findMany({ where, take: 1, orderBy });
      return results[0] || null;
    },

    async create({ data }: CreateArgs<TTable>): Promise<TableRow<TTable>> {
      const supabase = createAdminClient();

      // Handle nested creates (simplified)
      const mainData: Record<string, unknown> = { ...data };
      const nestedCreates: Record<string, unknown> = {};

      for (const key of Object.keys(data)) {
        const value = (data as Record<string, unknown>)[key];
        if (value && typeof value === 'object' && 'create' in (value as Record<string, unknown>)) {
          nestedCreates[key] = (value as Record<string, unknown>).create;
          delete mainData[key];
        }
      }

      let res = await supabase
        .from(targetTable)
        .insert(mainData as TableInsert<TTable>)
        .select()
        .single();

      if (res.error && (res.error.message?.includes('schema cache') || res.error.code === 'PGRST205')) {
        res = await supabase
          .from(altTable)
          .insert(mainData as TableInsert<TTable>)
          .select()
          .single();
      }

      if (res.error) {
        throw new PrismaCompatError(res.error.message, 'P2002');
      }

      return res.data;
    },

    async update({ where, data }: UpdateArgs<TTable>): Promise<TableRow<TTable>> {
      const supabase = createAdminClient();
      const [whereKey, whereValue] = Object.entries(where)[0] as [string, WhereValue<unknown>];

      if (isComparisonObject(whereValue)) {
        throw new PrismaCompatError('Complex where clauses are not supported for update', 'P2025');
      }

      let res = await supabase
        .from(targetTable)
        .update(data)
        .eq(whereKey, whereValue)
        .select()
        .single();

      if (res.error && (res.error.message?.includes('schema cache') || res.error.code === 'PGRST205')) {
        res = await supabase
          .from(altTable)
          .update(data)
          .eq(whereKey, whereValue)
          .select()
          .single();
      }

      if (res.error) {
        throw new PrismaCompatError(res.error.message, 'P2025');
      }

      return res.data;
    },

    async updateMany({ where, data }: UpdateManyArgs<TTable>): Promise<{ count: number }> {
      const supabase = createAdminClient();
      let query = supabase.from(targetTable).update(data);

      if (where) {
        for (const [key, value] of Object.entries(where)) {
          if (isComparisonObject(value)) {
            if (value.not !== undefined) {
              query = query.neq(key, value.not as string | number | boolean | null);
            }
          } else if (value !== undefined) {
            query = query.eq(key, value);
          }
        }
      }

      let res = await query.select();
      if (res.error && (res.error.message?.includes('schema cache') || res.error.code === 'PGRST205')) {
        let altQuery = supabase.from(altTable).update(data);
        if (where) {
          for (const [key, value] of Object.entries(where)) {
            if (isComparisonObject(value)) {
              if (value.not !== undefined) {
                altQuery = altQuery.neq(key, value.not as string | number | boolean | null);
              }
            } else if (value !== undefined) {
              altQuery = altQuery.eq(key, value);
            }
          }
        }
        res = await altQuery.select();
      }

      if (res.error) {
        throw new PrismaCompatError(res.error.message, 'P2025');
      }

      return { count: res.data?.length || 0 };
    },

    async delete({ where }: DeleteArgs<TTable>): Promise<TableRow<TTable>> {
      const supabase = createAdminClient();
      const [whereKey, whereValue] = Object.entries(where)[0] as [string, WhereValue<unknown>];

      if (isComparisonObject(whereValue)) {
        throw new PrismaCompatError('Complex where clauses are not supported for delete', 'P2025');
      }

      let res = await supabase
        .from(targetTable)
        .delete()
        .eq(whereKey, whereValue)
        .select()
        .single();

      if (res.error && (res.error.message?.includes('schema cache') || res.error.code === 'PGRST205')) {
        res = await supabase
          .from(altTable)
          .delete()
          .eq(whereKey, whereValue)
          .select()
          .single();
      }

      if (res.error) {
        throw new PrismaCompatError(res.error.message, 'P2025');
      }

      return res.data;
    },

    async deleteMany({ where }: DeleteManyArgs<TTable> = {}): Promise<{ count: number }> {
      const supabase = createAdminClient();
      let query = supabase.from(targetTable).delete();

      if (where) {
        for (const [key, value] of Object.entries(where)) {
          if (isComparisonObject(value)) {
            if (value.not !== undefined) {
              query = query.neq(key, value.not as string | number | boolean | null);
            }
          } else if (value !== undefined) {
            query = query.eq(key, value);
          }
        }
      }

      let res = await query.select();
      if (res.error && (res.error.message?.includes('schema cache') || res.error.code === 'PGRST205')) {
        let altQuery = supabase.from(altTable).delete();
        if (where) {
          for (const [key, value] of Object.entries(where)) {
            if (isComparisonObject(value)) {
              if (value.not !== undefined) {
                altQuery = altQuery.neq(key, value.not as string | number | boolean | null);
              }
            } else if (value !== undefined) {
              altQuery = altQuery.eq(key, value);
            }
          }
        }
        res = await altQuery.select();
      }

      if (res.error) {
        throw new PrismaCompatError(res.error.message, 'P2003');
      }

      return { count: res.data?.length || 0 };
    },

    async count({ where }: CountArgs<TTable> = {}): Promise<number> {
      const supabase = createAdminClient();
      let query = supabase.from(targetTable).select('id', { count: 'exact', head: true });

      if (where) {
        for (const [key, value] of Object.entries(where)) {
          if (isComparisonObject(value)) {
            if (value.gte !== undefined) {
              query = query.gte(key, value.gte as string | number);
            }
            if (value.not !== undefined) {
              query = query.neq(key, value.not as string | number | boolean | null);
            }
          } else if (value !== undefined) {
            query = query.eq(key, value);
          }
        }
      }

      let res = await query;
      if (res.error && (res.error.message?.includes('schema cache') || res.error.code === 'PGRST205')) {
        let altQuery = supabase.from(altTable).select('id', { count: 'exact', head: true });
        if (where) {
          for (const [key, value] of Object.entries(where)) {
            if (isComparisonObject(value)) {
              if (value.gte !== undefined) {
                altQuery = altQuery.gte(key, value.gte as string | number);
              }
              if (value.not !== undefined) {
                altQuery = altQuery.neq(key, value.not as string | number | boolean | null);
              }
            } else if (value !== undefined) {
              altQuery = altQuery.eq(key, value);
            }
          }
        }
        res = await altQuery;
      }

      if (res.error) {
        throw new PrismaCompatError(res.error.message, 'P2002');
      }

      return res.count || 0;
    },

    async upsert({ where, create, update }: UpsertArgs<TTable>): Promise<TableRow<TTable>> {
      const existing = await this.findUnique({ where });

      if (existing) {
        return this.update({ where, data: update });
      }

      return this.create({ data: create });
    },
  };
}

type PrismaTableMap = {
  user: PrismaTableAccessor<'User'>;
  profile: PrismaTableAccessor<'Profile'>;
  job: PrismaTableAccessor<'Job'>;
  proposal: PrismaTableAccessor<'Proposal'>;
  contract: PrismaTableAccessor<'Contract'>;
  message: PrismaTableAccessor<'Message'>;
  notification: PrismaTableAccessor<'Notification'>;
  payment: PrismaTableAccessor<'Payment'>;
  invoice: PrismaTableAccessor<'Invoice'>;
  milestone: PrismaTableAccessor<'Milestone'>;
  subscription: PrismaTableAccessor<'Subscription'>;
  payPalPayment: PrismaTableAccessor<'PayPalPayment'>;
  fraudFlag: PrismaTableAccessor<'FraudFlag'>;
  verification: PrismaTableAccessor<'Verification'>;
  document: PrismaTableAccessor<'Document'>;
  supportTicket: PrismaTableAccessor<'SupportTicket'>;
  ticketResponse: PrismaTableAccessor<'TicketResponse'>;
  emailVerificationToken: PrismaTableAccessor<'EmailVerificationToken'>;
  portfolioItem: PrismaTableAccessor<'PortfolioItem'>;
  experienceItem: PrismaTableAccessor<'ExperienceItem'>;
  educationItem: PrismaTableAccessor<'EducationItem'>;
  certification: PrismaTableAccessor<'Certification'>;
  tokenLog: PrismaTableAccessor<'TokenLog'>;
  tokenPurchasePlan: PrismaTableAccessor<'TokenPurchasePlan'>;
  subscriptionPlanConfig: PrismaTableAccessor<'SubscriptionPlanConfig'>;
  profileView: PrismaTableAccessor<'ProfileView'>;
};

type TransactionOperation<T> = (tx: PrismaCompatClient) => Promise<T>;

interface PrismaCompatClient extends PrismaTableMap {
  $transaction<T>(operations: TransactionOperation<T>[] | TransactionOperation<T>): Promise<T | T[]>;
  $disconnect(): Promise<void>;
}

/**
 * Prisma-compatible client object
 *
 * Usage:
 * ```
 * import { prisma } from '@/lib/prisma';
 *
 * const user = await prisma.user.findUnique({ where: { id: '123' } });
 * const users = await prisma.user.findMany({ where: { role: 'FREELANCER' } });
 * ```
 */
export const prisma: PrismaCompatClient = {
  user: createTableAccessor('User'),
  profile: createTableAccessor('Profile'),
  job: createTableAccessor('Job'),
  proposal: createTableAccessor('Proposal'),
  contract: createTableAccessor('Contract'),
  message: createTableAccessor('Message'),
  notification: createTableAccessor('Notification'),
  payment: createTableAccessor('Payment'),
  invoice: createTableAccessor('Invoice'),
  milestone: createTableAccessor('Milestone'),
  subscription: createTableAccessor('Subscription'),
  payPalPayment: createTableAccessor('PayPalPayment'),
  fraudFlag: createTableAccessor('FraudFlag'),
  verification: createTableAccessor('Verification'),
  document: createTableAccessor('Document'),
  supportTicket: createTableAccessor('SupportTicket'),
  ticketResponse: createTableAccessor('TicketResponse'),
  emailVerificationToken: createTableAccessor('EmailVerificationToken'),
  portfolioItem: createTableAccessor('PortfolioItem'),
  experienceItem: createTableAccessor('ExperienceItem'),
  educationItem: createTableAccessor('EducationItem'),
  certification: createTableAccessor('Certification'),
  tokenLog: createTableAccessor('TokenLog'),
  tokenPurchasePlan: createTableAccessor('TokenPurchasePlan'),
  subscriptionPlanConfig: createTableAccessor('SubscriptionPlanConfig'),
  profileView: createTableAccessor('ProfileView'),

  // Add Prisma transaction support (simplified - sequential execution)
  async $transaction<T>(
    operations: TransactionOperation<T>[] | TransactionOperation<T>
  ): Promise<T | T[]> {
    if (Array.isArray(operations)) {
      const results: T[] = [];
      for (const operation of operations) {
        results.push(await operation(this));
      }
      return results;
    }

    // Single transaction callback
    return operations(this);
  },

  // Add disconnect method (no-op for Supabase)
  async $disconnect(): Promise<void> {
    // Supabase connections are managed automatically, no need to disconnect
    return Promise.resolve();
  },
};

// Make it available as a global (for compatibility)
if (typeof global !== 'undefined') {
  (globalThis as typeof globalThis & { prisma?: PrismaCompatClient }).prisma = prisma;
}

export default prisma;
