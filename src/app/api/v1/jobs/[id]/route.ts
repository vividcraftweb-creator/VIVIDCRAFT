import { NextRequest, NextResponse } from 'next/server';
import { withApiKey, logSuccess } from '@/lib/api/middleware';
import { createClient } from '@/lib/supabase/server';

type JobUpdatableFields = {
  title?: string;
  description?: string;
  category?: string;
  skills?: string[];
  budgetType?: string;
  budgetAmount?: number;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  duration?: string;
  experienceLevel?: string;
  location?: string;
  locationType?: string;
  status?: string;
};

const JOB_UPDATE_FIELDS: Array<keyof JobUpdatableFields> = [
  'title',
  'description',
  'category',
  'skills',
  'budgetType',
  'budgetAmount',
  'budgetMin',
  'budgetMax',
  'currency',
  'duration',
  'experienceLevel',
  'location',
  'locationType',
  'status',
];
/**
 * GET /api/v1/jobs/:id - Get a specific job
 * Required scope: read:jobs
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const auth = await withApiKey(request, ['read:jobs']);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from('Job')
      .select('*, client:User!Job_clientId_fkey(id, email, profile:Profile(*))')
      .eq('id', params.id)
      .eq('clientId', auth.context.user.id)
      .single();

    if (error || !job) {
      await logSuccess(auth.context, 404, request);
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'Job not found',
        },
        { status: 404 }
      );
    }

    await logSuccess(auth.context, 200, request);

    return NextResponse.json({
      data: job,
    });
  } catch (error: unknown) {
    await logSuccess(auth.context, 500, request);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch job',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/jobs/:id - Update a job
 * Required scope: write:jobs
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const auth = await withApiKey(request, ['write:jobs']);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as JobUpdatableFields;
    const supabase = await createClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('Job')
      .select('id')
      .eq('id', params.id)
      .eq('clientId', auth.context.user.id)
      .single();

    if (!existing) {
      await logSuccess(auth.context, 404, request);
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'Job not found',
        },
        { status: 404 }
      );
    }

    // Update job
    const updateData: JobUpdatableFields & { updatedAt: string } = {
      updatedAt: new Date().toISOString(),
    };

    JOB_UPDATE_FIELDS.forEach((field) => {
      const value = body[field];
      if (value !== undefined) {
        (updateData as Record<string, unknown>)[field as string] = value;
      }
    });

    const { data: job, error } = await supabase
      .from('Job')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await logSuccess(auth.context, 200, request);

    return NextResponse.json({
      data: job,
      message: 'Job updated successfully',
    });
  } catch (error: unknown) {
    await logSuccess(auth.context, 500, request);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to update job',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/jobs/:id - Delete a job
 * Required scope: write:jobs
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const auth = await withApiKey(request, ['write:jobs']);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const supabase = await createClient();

    // Verify ownership and delete
    const { error } = await supabase
      .from('Job')
      .delete()
      .eq('id', params.id)
      .eq('clientId', auth.context.user.id);

    if (error) {
      if (error.code === 'PGRST116') {
        await logSuccess(auth.context, 404, request);
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Job not found',
          },
          { status: 404 }
        );
      }
      throw error;
    }

    await logSuccess(auth.context, 200, request);

    return NextResponse.json({
      message: 'Job deleted successfully',
    });
  } catch (error: unknown) {
    await logSuccess(auth.context, 500, request);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to delete job',
      },
      { status: 500 }
    );
  }
}
