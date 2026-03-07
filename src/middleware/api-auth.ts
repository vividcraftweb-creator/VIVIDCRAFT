import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, hasScope, checkRateLimit, logApiRequest, getRateLimitForPlan, ApiKeyUser } from '@/lib/api/auth';

/**
 * Middleware to authenticate API requests
 * Usage: Wrap your API route handler with this middleware
 */
export async function withApiAuth(
  req: NextRequest,
  requiredScope: string,
  handler: (req: NextRequest, context: ApiContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Missing or invalid Authorization header',
          message: 'Please provide a valid API key in the format: Authorization: Bearer YOUR_API_KEY'
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '').trim();

    // Validate API key
    const authResult = await validateApiKey(apiKey);

    if (!authResult) {
      return NextResponse.json(
        {
          error: 'Invalid API key',
          message: 'The provided API key is invalid, expired, or has been revoked'
        },
        { status: 401 }
      );
    }

    const { user, scopes, apiKeyId } = authResult;

    // Check if user has required scope
    if (!hasScope(scopes, requiredScope)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          message: `This API key does not have the required permission: ${requiredScope}`
        },
        { status: 403 }
      );
    }

    // Get rate limit for user's plan
    const rateLimit = getRateLimitForPlan(user.subscriptionPlan ?? 'FREE');

    if (rateLimit === 0) {
      return NextResponse.json(
        {
          error: 'API access not available',
          message: 'Please upgrade to Business or Enterprise plan to use the API'
        },
        { status: 403 }
      );
    }

    // Check rate limit
    const endpoint = new URL(req.url).pathname;
    const rateLimitOk = await checkRateLimit(apiKeyId, endpoint, rateLimit);

    if (!rateLimitOk) {
      const responseTime = Date.now() - startTime;
      await logApiRequest(
        apiKeyId,
        req.method,
        endpoint,
        429,
        responseTime,
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        req.headers.get('user-agent') || undefined
      );

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You have exceeded the rate limit of ${rateLimit} requests per hour. Please try again later.`,
          limit: rateLimit,
          window: '1 hour'
        },
        { status: 429 }
      );
    }

    // Call the actual handler
    const response = await handler(req, {
      user,
      scopes,
      apiKeyId
    });

    // Log successful request
    const responseTime = Date.now() - startTime;
    await logApiRequest(
      apiKeyId,
      req.method,
      endpoint,
      response.status,
      responseTime,
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return response;

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request'
      },
      { status: 500 }
    );
  }
}

/**
 * Context passed to API handlers
 */
export interface ApiContext {
  user: ApiKeyUser;
  scopes: string[];
  apiKeyId: string;
}
