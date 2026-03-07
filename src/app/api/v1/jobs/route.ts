import { NextRequest, NextResponse } from 'next/server';
import { withApiKey, logSuccess } from '@/lib/api/middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/jobs - List jobs
 * Required scope: read:jobs
 */
export async function GET(request: NextRequest) {
  const auth = await withApiKey(request, ['read:jobs']);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    const supabase = await createClient();

    let query = supabase
      .from('Job')
      .select('*, client:User!Job_clientId_fkey(id, email, profile:Profile(*))', { count: 'exact' })
      .eq('clientId', auth.context.user.id)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error, count } = await query;

    if (error) {
      throw error;
    }

    await logSuccess(auth.context, 200, request);

    return NextResponse.json({
      data: jobs,
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    });
  } catch (error: unknown) {
    await logSuccess(auth.context, 500, request);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch jobs',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/jobs - Create a new job
 * Required scope: write:jobs
 */
export async function POST(request: NextRequest) {
  const auth = await withApiKey(request, ['write:jobs']);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'category', 'budgetType'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            error: 'Validation Error',
            message: `Missing required field: ${field}`,
          },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // Ensure only verified client accounts can publish jobs via the API
    const { data: apiUser, error: apiUserError } = await supabase
      .from('User')
      .select('role, isVerified')
      .eq('id', auth.context.user.id)
      .single();

    if (apiUserError || !apiUser) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Unable to determine account status for this API key.',
        },
        { status: 401 }
      );
    }

    if (apiUser.role !== 'CLIENT') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Only client accounts can create job postings.',
        },
        { status: 403 }
      );
    }

    if (!apiUser.isVerified) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Client account must complete identity verification before posting jobs.',
        },
        { status: 403 }
      );
    }

    const { data: job, error } = await supabase
      .from('Job')
      .insert({
        clientId: auth.context.user.id,
        title: body.title,
        description: body.description,
        category: body.category,
        skills: body.skills || [],
        budgetType: body.budgetType,
        budgetAmount: body.budgetAmount,
        budgetMin: body.budgetMin,
        budgetMax: body.budgetMax,
        currency: body.currency || 'USD',
        duration: body.duration,
        experienceLevel: body.experienceLevel,
        location: body.location,
        locationType: body.locationType || 'REMOTE',
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await logSuccess(auth.context, 201, request);

    return NextResponse.json(
      {
        data: job,
        message: 'Job created successfully',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    await logSuccess(auth.context, 500, request);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create job',
      },
      { status: 500 }
    );
  }
}
