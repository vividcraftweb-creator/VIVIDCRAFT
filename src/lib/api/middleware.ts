import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, hasScope, checkRateLimit, logApiRequest, getRateLimitForPlan, ApiKeyUser } from './auth';
import { getUserFeaturePermissions } from '@/lib/feature-enforcement';

export interface ApiContext {
  user: ApiKeyUser;
  scopes: string[];
  apiKeyId: string;
  requestStart: number;
}

/**
 * Middleware to validate API key and check permissions
 */
export async function withApiKey(
  request: NextRequest,
  requiredScopes: string[] = []
): Promise<{ success: true; context: ApiContext } | { success: false; response: NextResponse }> {
  const requestStart = Date.now();

  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header. Use: Authorization: Bearer jh_live_...',
          },
          { status: 401 }
        ),
      };
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer '

    // Validate API key
    const validation = await validateApiKey(apiKey);
    if (!validation) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Invalid or revoked API key',
          },
          { status: 401 }
        ),
      };
    }

    // Check user has API access (Business or Enterprise plan)
    const permissions = await getUserFeaturePermissions(validation.user.id);
    if (!permissions.hasTeamCollaboration) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'API access requires Business or Enterprise plan',
          },
          { status: 403 }
        ),
      };
    }

    // Check required scopes
    for (const requiredScope of requiredScopes) {
      if (!hasScope(validation.scopes, requiredScope)) {
        await logApiRequest(
          validation.apiKeyId,
          request.method,
          request.nextUrl.pathname,
          403,
          Date.now() - requestStart,
          request.headers.get('x-forwarded-for') || undefined,
          request.headers.get('user-agent') || undefined
        );

        return {
          success: false,
          response: NextResponse.json(
            {
              error: 'Forbidden',
              message: `Missing required scope: ${requiredScope}`,
              requiredScopes,
              availableScopes: validation.scopes,
            },
            { status: 403 }
          ),
        };
      }
    }

    // Get rate limit for user's plan
    const userSubscription = await getUserSubscription(validation.user.id);
    const rateLimit = getRateLimitForPlan(userSubscription?.plan || 'FREE');

    if (rateLimit === 0) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'API access not available on your plan',
          },
          { status: 403 }
        ),
      };
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(
      validation.apiKeyId,
      request.nextUrl.pathname,
      rateLimit
    );

    if (!withinLimit) {
      await logApiRequest(
        validation.apiKeyId,
        request.method,
        request.nextUrl.pathname,
        429,
        Date.now() - requestStart,
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      );

      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Rate Limit Exceeded',
            message: `Rate limit of ${rateLimit} requests per hour exceeded`,
            limit: rateLimit,
            retryAfter: 3600, // seconds until next window
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimit.toString(),
              'X-RateLimit-Remaining': '0',
              'Retry-After': '3600',
            },
          }
        ),
      };
    }

    return {
      success: true,
      context: {
        user: validation.user,
        scopes: validation.scopes,
        apiKeyId: validation.apiKeyId,
        requestStart,
      },
    };
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Get user subscription info
 */
async function getUserSubscription(userId: string): Promise<{ plan: string } | null> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data: subscription } = await supabase
      .from('Subscription')
      .select('plan')
      .eq('userId', userId)
      .eq('status', 'ACTIVE')
      .single();

    return subscription;
  } catch {
    return null;
  }
}

/**
 * Log successful API request
 */
export async function logSuccess(
  context: ApiContext,
  statusCode: number,
  request: NextRequest
): Promise<void> {
  const responseTime = Date.now() - context.requestStart;
  await logApiRequest(
    context.apiKeyId,
    request.method,
    request.nextUrl.pathname,
    statusCode,
    responseTime,
    request.headers.get('x-forwarded-for') || undefined,
    request.headers.get('user-agent') || undefined
  );
}
