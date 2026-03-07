import { NextRequest, NextResponse } from 'next/server';
import { parseWebhookNotification, handleBraintreeWebhook } from '@/lib/braintree';

// Force this route to be dynamic (not statically analyzed at build time)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Braintree sends the signature as query parameters
    const btSignature = searchParams.get('bt_signature');
    const btPayload = searchParams.get('bt_payload');

    if (!btSignature || !btPayload) {
      return NextResponse.json({ error: 'Missing webhook parameters' }, { status: 400 });
    }

    try {
      // Parse and verify webhook
      const notification = await parseWebhookNotification(btSignature, btPayload);

      // Handle the webhook event
      await handleBraintreeWebhook(notification);
    } catch (error) {
      // Error processing webhook
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle GET requests (for webhook verification during setup)
export async function GET() {
  return NextResponse.json({ status: 'Braintree webhook endpoint active' });
}
