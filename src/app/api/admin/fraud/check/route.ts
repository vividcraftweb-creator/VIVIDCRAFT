import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { runFraudDetection, autoSuspendIfNeeded } from '@/lib/fraud-detection';

// POST - Run fraud detection on a specific user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Only admins can manually trigger fraud detection
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Run fraud detection
    const result = await runFraudDetection(userId);

    // Auto-suspend if needed
    const wasSuspended = await autoSuspendIfNeeded(userId, result);

    return NextResponse.json({
      success: true,
      result,
      wasSuspended,
    });
  } catch (error) {
  }
}
