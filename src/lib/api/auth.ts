import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export interface ApiKeyUser {
  id: string;
  email?: string | null;
  subscriptionPlan?: string | null;
  role?: string | null;
}

export interface ValidatedApiKey {
  user: ApiKeyUser;
  scopes: string[];
  apiKeyId: string;
}

const isApiKeyUser = (value: unknown): value is ApiKeyUser => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string';
};

/**
 * Generate a secure API key
 * Format: jh_live_<random_string>
 */
export async function generateApiKey(): Promise<{
  key: string;
  keyHash: string;
  keyPrefix: string;
}> {
  // Generate 32 random bytes (256 bits)
  const randomBytes = crypto.randomBytes(32);
  const keyString = randomBytes.toString('base64url'); // URL-safe base64

  // Create full key with prefix
  const key = `jh_live_${keyString}`;

  // Hash the key for storage (SHA-256)
  const keyHash = crypto
    .createHash('sha256')
    .update(key)
    .digest('hex');

  // Store only first 8 characters as prefix for identification
  const keyPrefix = key.substring(0, 15); // "jh_live_abc123..."

  return { key, keyHash, keyPrefix };
}

/**
 * Validate API key and return user info
 */
export async function validateApiKey(apiKey: string): Promise<ValidatedApiKey | null> {
  if (!apiKey || !apiKey.startsWith('jh_live_')) {
    return null;
  }

  // Hash the provided key
  const keyHash = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');

  const supabase = await createClient();

  // Find API key in database
  const { data: apiKeyRecord, error } = await supabase
    .from('ApiKey')
    .select('*, User(*)')
    .eq('keyHash', keyHash)
    .is('revokedAt', null)
    .single();

  if (error || !apiKeyRecord) {
    return null;
  }

  // Check if key is expired
  if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
    return null;
  }

  // Update last used timestamp
  await supabase
    .from('ApiKey')
    .update({ lastUsedAt: new Date().toISOString() })
    .eq('id', apiKeyRecord.id);

  if (!isApiKeyUser(apiKeyRecord.User)) {
    return null;
  }

  return {
    user: apiKeyRecord.User,
    scopes: Array.isArray(apiKeyRecord.scopes) ? apiKeyRecord.scopes : [],
    apiKeyId: apiKeyRecord.id,
  };
}

/**
 * Check if API key has required scope
 */
export function hasScope(scopes: string[], requiredScope: string): boolean {
  // Wildcard scope grants all permissions
  if (scopes.includes('*')) {
    return true;
  }

  // Check exact match
  if (scopes.includes(requiredScope)) {
    return true;
  }

  // Check wildcard patterns (e.g., 'read:*' matches 'read:jobs')
  const parts = requiredScope.split(':');
  if (parts.length === 2) {
    const wildcardScope = `${parts[0]}:*`;
    if (scopes.includes(wildcardScope)) {
      return true;
    }
  }

  return false;
}

/**
 * Rate limiting check
 */
export async function checkRateLimit(
  apiKeyId: string,
  endpoint: string,
  limit: number // requests per hour
): Promise<boolean> {
  const supabase = await createClient();

  // Current hour window
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

  // Get or create rate limit record
  const { data: rateLimitRecord } = await supabase
    .from('ApiRateLimit')
    .select('*')
    .eq('apiKeyId', apiKeyId)
    .eq('endpoint', endpoint)
    .eq('windowStart', windowStart.toISOString())
    .single();

  if (!rateLimitRecord) {
    // First request in this window
    await supabase
      .from('ApiRateLimit')
      .insert({
        apiKeyId,
        endpoint,
        requestCount: 1,
        windowStart: windowStart.toISOString()
      });
    return true;
  }

  // Check if limit exceeded
  if (rateLimitRecord.requestCount >= limit) {
    return false;
  }

  // Increment counter
  await supabase
    .from('ApiRateLimit')
    .update({ requestCount: rateLimitRecord.requestCount + 1 })
    .eq('id', rateLimitRecord.id);

  return true;
}

/**
 * Log API request
 */
export async function logApiRequest(
  apiKeyId: string,
  method: string,
  endpoint: string,
  statusCode: number,
  responseTime?: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('ApiRequestLog')
    .insert({
      apiKeyId,
      method,
      endpoint,
      statusCode,
      responseTime,
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString()
    });
}

/**
 * Get rate limit for subscription plan
 */
export function getRateLimitForPlan(plan: string): number {
  switch (plan) {
    case 'CLIENT_ENTERPRISE':
      return 1000; // 1000 req/hour
    case 'CLIENT_BUSINESS':
      return 100; // 100 req/hour
    default:
      return 0; // No API access for free/starter plans
  }
}
