import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { emailTemplates } from '@/lib/email-edge';
import { ticketRateLimit } from '@/lib/rate-limit';

// GET - Fetch user's tickets
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Check if user's email is verified
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('isVerified')
      .eq('id', session.user.id)
      .single();

    if (userError || !user?.isVerified) {
      return NextResponse.json({ error: 'Please verify your email address to access this feature' }, { status: 403 });
    }

    const { data: tickets, error: ticketsError } = await supabase
      .from('SupportTicket')
      .select(`
        *,
        messages:SupportTicketMessage(*)
      `)
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false });

    if (ticketsError) {
      throw ticketsError;
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// POST - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting - 3 tickets per hour per user
    const rateLimitResult = await ticketRateLimit(request, session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many support tickets. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();

    // Check if user's email is verified
    const { data: verifiedUser, error: verifyError } = await supabase
      .from('User')
      .select('isVerified')
      .eq('id', session.user.id)
      .single();

    if (verifyError || !verifiedUser?.isVerified) {
      return NextResponse.json({ error: 'Please verify your email address to access this feature' }, { status: 403 });
    }

    const body = await request.json();
    const { subject, message, category, priority } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Generate ticket number
    const { count } = await supabase
      .from('SupportTicket')
      .select('*', { count: 'exact', head: true });

    const ticketNumber = `TICKET-${String((count || 0) + 1).padStart(6, '0')}`;

    // Generate UUID for ticket id
    const ticketId = crypto.randomUUID();

    // Create ticket
    const now = new Date().toISOString();
    const { data: ticket, error: createError } = await supabase
      .from('SupportTicket')
      .insert({
        id: ticketId,
        userId: session.user.id,
        ticketNumber,
        subject,
        message,
        category: category?.toLowerCase() || 'general',
        priority: priority?.toLowerCase() || 'medium',
        status: 'open',
        createdAt: now,
        updatedAt: now,
      })
      .select(`
        *,
        user:User(
          email,
          role,
          profile:Profile(
            firstName,
            lastName
          )
        )
      `)
      .single();

    if (createError || !ticket) {
      console.error('Ticket creation error:', createError);
      return NextResponse.json({
        error: 'Failed to create ticket',
        details: createError?.message || 'Unknown error'
      }, { status: 500 });
    }

    // Send confirmation email to user
    try {
      const firstName = ticket.user.profile?.firstName || undefined;
      const userEmail = session.user.email || '';
      await emailTemplates.sendSupportTicketCreatedEmail(
        userEmail,
        ticketNumber,
        subject,
        firstName
      );
    } catch (emailError) {
      console.error('Email error (non-critical):', emailError);
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({
      error: 'Failed to create ticket',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
