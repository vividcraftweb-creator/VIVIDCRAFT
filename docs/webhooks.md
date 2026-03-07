# JobHorizons Webhooks Documentation

## Overview

JobHorizons webhooks allow you to receive real-time notifications about events in your account. When an event occurs (like a new proposal or completed milestone), JobHorizons sends an HTTP POST request to the URL you've configured.

## Table of Contents

- [Quick Start](#quick-start)
- [Security](#security)
- [Event Types](#event-types)
- [Payload Examples](#payload-examples)
- [Signature Verification](#signature-verification)
- [Retry Policy](#retry-policy)
- [Best Practices](#best-practices)
- [Testing](#testing)

---

## Quick Start

1. **Create a webhook endpoint** at `/dashboard?tab=webhooks`
2. **Select events** you want to receive
3. **Save your secret** - it's shown only once!
4. **Verify signatures** in your endpoint code
5. **Return 200 OK** quickly (process async)

---

## Security

### HTTPS Required

All webhook URLs must use HTTPS. This ensures that the payload is encrypted in transit.

### Signature Verification

Every webhook request includes an `X-JobHorizons-Signature` header containing an HMAC SHA-256 signature. **You must verify this signature** to ensure the request came from JobHorizons.

The signature is calculated as:
```
HMAC-SHA256(secret, request_body)
```

See [Signature Verification](#signature-verification) section for code examples.

### Best Practices

- ✅ Always verify the signature before processing
- ✅ Use HTTPS for your webhook URL
- ✅ Store your webhook secret securely (environment variables)
- ✅ Return 200 OK within 5 seconds
- ✅ Process webhooks asynchronously (use a queue)
- ❌ Never expose your webhook secret in client-side code
- ❌ Never skip signature verification in production

---

## Event Types

JobHorizons sends webhooks for the following events:

| Event | Description | Who Receives It |
|-------|-------------|-----------------|
| `job.created` | A new job is posted | Client who posted the job |
| `job.closed` | A job is closed (proposal accepted) | Client who owns the job |
| `job.reopened` | A closed job is reopened | Client who owns the job |
| `proposal.submitted` | A freelancer submits a proposal | Client who posted the job |
| `proposal.accepted` | A client accepts a proposal | Freelancer whose proposal was accepted |
| `proposal.rejected` | A client rejects a proposal | Freelancer whose proposal was rejected |
| `contract.signed` | Both parties sign a contract | Both client and freelancer |
| `contract.completed` | A contract is marked complete | Both client and freelancer |
| `contract.terminated` | A contract is terminated early | Both client and freelancer |
| `milestone.completed` | A milestone is approved | Both client and freelancer |
| `payment.released` | Payment milestone is confirmed | Both client and freelancer |

---

## Payload Examples

All webhooks follow this structure:

```json
{
  "event": "event.type",
  "timestamp": "2025-11-11T03:00:00.000Z",
  "data": {
    // Event-specific data
  }
}
```

### job.created

Sent when a client posts a new job.

```json
{
  "event": "job.created",
  "timestamp": "2025-11-11T03:00:00.000Z",
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Full-Stack Developer Needed",
    "slug": "full-stack-developer-needed",
    "budget": 5000,
    "deadline": "2025-12-31T00:00:00.000Z",
    "tags": ["react", "node.js", "postgresql"],
    "description": "We are looking for an experienced full-stack developer...",
    "status": "OPEN",
    "is_approved": true,
    "created_at": "2025-11-11T03:00:00.000Z"
  }
}
```

### job.closed

Sent when a job is closed (typically because a proposal was accepted).

```json
{
  "event": "job.closed",
  "timestamp": "2025-11-11T04:30:00.000Z",
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Full-Stack Developer Needed",
    "slug": "full-stack-developer-needed",
    "closed_at": "2025-11-11T04:30:00.000Z",
    "reason": "proposal_accepted",
    "accepted_proposal_id": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

### job.reopened

Sent when a client reopens a previously closed job.

```json
{
  "event": "job.reopened",
  "timestamp": "2025-11-12T10:00:00.000Z",
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Full-Stack Developer Needed",
    "slug": "full-stack-developer-needed",
    "reopened_at": "2025-11-12T10:00:00.000Z",
    "new_expiry_date": "2025-12-12T10:00:00.000Z"
  }
}
```

### proposal.submitted

Sent when a freelancer submits a proposal to a job.

```json
{
  "event": "proposal.submitted",
  "timestamp": "2025-11-11T05:15:00.000Z",
  "data": {
    "proposal_id": "770e8400-e29b-41d4-a716-446655440002",
    "job": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Full-Stack Developer Needed",
      "slug": "full-stack-developer-needed"
    },
    "freelancer": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "Jane Doe"
    },
    "bid_amount": 4500,
    "estimated_duration": "6 weeks",
    "submitted_at": "2025-11-11T05:15:00.000Z"
  }
}
```

### proposal.accepted

Sent to the freelancer when their proposal is accepted.

```json
{
  "event": "proposal.accepted",
  "timestamp": "2025-11-11T06:00:00.000Z",
  "data": {
    "proposal_id": "770e8400-e29b-41d4-a716-446655440002",
    "job": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Full-Stack Developer Needed",
      "slug": "full-stack-developer-needed"
    },
    "accepted_at": "2025-11-11T06:00:00.000Z"
  }
}
```

### proposal.rejected

Sent to the freelancer when their proposal is rejected.

```json
{
  "event": "proposal.rejected",
  "timestamp": "2025-11-11T06:30:00.000Z",
  "data": {
    "proposal_id": "770e8400-e29b-41d4-a716-446655440002",
    "job": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Full-Stack Developer Needed",
      "slug": "full-stack-developer-needed"
    },
    "rejected_at": "2025-11-11T06:30:00.000Z",
    "rejection_reason": "We decided to go with a different candidate"
  }
}
```

### milestone.completed

Sent when a milestone is approved (work completed and confirmed).

```json
{
  "event": "milestone.completed",
  "timestamp": "2025-11-20T14:00:00.000Z",
  "data": {
    "milestone_id": "990e8400-e29b-41d4-a716-446655440004",
    "title": "Frontend Development Phase",
    "amount": 2000,
    "contract_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "freelancer": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "Jane Doe"
    },
    "approved_at": "2025-11-20T14:00:00.000Z",
    "approval_note": "Great work! Frontend looks perfect.",
    "payment_handled_externally": true
  }
}
```

### payment.released

Sent when a payment milestone is confirmed (client confirms payment was made externally).

```json
{
  "event": "payment.released",
  "timestamp": "2025-11-20T14:00:00.000Z",
  "data": {
    "milestone_id": "990e8400-e29b-41d4-a716-446655440004",
    "milestone_title": "Frontend Development Phase",
    "amount": 2000,
    "contract_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "freelancer": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "Jane Doe"
    },
    "released_at": "2025-11-20T14:00:00.000Z",
    "payment_method": "milestone_approval"
  }
}
```

### contract.signed

Sent when both parties sign a contract (future implementation).

```json
{
  "event": "contract.signed",
  "timestamp": "2025-11-11T07:00:00.000Z",
  "data": {
    "contract_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "client": {
      "id": "bb0e8400-e29b-41d4-a716-446655440006",
      "name": "Acme Corp"
    },
    "freelancer": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "Jane Doe"
    },
    "signed_at": "2025-11-11T07:00:00.000Z"
  }
}
```

### contract.completed

Sent when a contract is marked as complete (future implementation).

```json
{
  "event": "contract.completed",
  "timestamp": "2025-12-15T18:00:00.000Z",
  "data": {
    "contract_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_milestones": 3,
    "total_amount": 5000,
    "completed_at": "2025-12-15T18:00:00.000Z"
  }
}
```

### contract.terminated

Sent when a contract is terminated early (future implementation).

```json
{
  "event": "contract.terminated",
  "timestamp": "2025-11-25T12:00:00.000Z",
  "data": {
    "contract_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "terminated_at": "2025-11-25T12:00:00.000Z",
    "termination_reason": "Mutual agreement to end project early"
  }
}
```

---

## Signature Verification

### Node.js / TypeScript

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express.js example
app.post('/webhooks/jobhorizons', (req, res) => {
  const signature = req.headers['x-jobhorizons-signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.JOBHORIZONS_WEBHOOK_SECRET;

  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  const event = req.body;
  console.log('Received event:', event.event);

  // IMPORTANT: Return 200 quickly, process asynchronously
  res.status(200).send('OK');

  // Queue for async processing
  processWebhookAsync(event);
});
```

### Python (Flask)

```python
import hmac
import hashlib
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

def verify_webhook_signature(payload, signature, secret):
    """Verify the webhook signature"""
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/jobhorizons', methods=['POST'])
def webhook():
    signature = request.headers.get('X-JobHorizons-Signature')
    payload = request.get_data(as_text=True)
    secret = os.getenv('JOBHORIZONS_WEBHOOK_SECRET')

    if not verify_webhook_signature(payload, signature, secret):
        return jsonify({'error': 'Invalid signature'}), 401

    # Process webhook
    event = request.get_json()
    print(f"Received event: {event['event']}")

    # IMPORTANT: Return 200 quickly, process asynchronously
    # Use Celery, RQ, or similar for async processing
    process_webhook_async.delay(event)

    return jsonify({'status': 'ok'}), 200
```

### PHP

```php
<?php

function verifyWebhookSignature($payload, $signature, $secret) {
    $expectedSignature = hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expectedSignature);
}

// Get raw POST body
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_JOBHORIZONS_SIGNATURE'] ?? '';
$secret = getenv('JOBHORIZONS_WEBHOOK_SECRET');

if (!verifyWebhookSignature($payload, $signature, $secret)) {
    http_response_code(401);
    die('Invalid signature');
}

// Process webhook
$event = json_decode($payload, true);
error_log("Received event: " . $event['event']);

// IMPORTANT: Return 200 quickly, process asynchronously
http_response_code(200);
echo 'OK';

// Queue for async processing (use Laravel Queue, Beanstalk, etc.)
processWebhookAsync($event);
```

### Ruby (Rails)

```ruby
require 'openssl'

def verify_webhook_signature(payload, signature, secret)
  expected_signature = OpenSSL::HMAC.hexdigest(
    'SHA256',
    secret,
    payload
  )

  ActiveSupport::SecurityUtils.secure_compare(
    signature,
    expected_signature
  )
end

class WebhooksController < ApplicationController
  skip_before_action :verify_authenticity_token

  def jobhorizons
    payload = request.raw_post
    signature = request.headers['X-JobHorizons-Signature']
    secret = ENV['JOBHORIZONS_WEBHOOK_SECRET']

    unless verify_webhook_signature(payload, signature, secret)
      return render json: { error: 'Invalid signature' }, status: :unauthorized
    end

    # Process webhook
    event = JSON.parse(payload)
    Rails.logger.info "Received event: #{event['event']}"

    # IMPORTANT: Return 200 quickly, process asynchronously
    ProcessWebhookJob.perform_later(event)

    render json: { status: 'ok' }, status: :ok
  end
end
```

---

## Retry Policy

JobHorizons automatically retries failed webhook deliveries using exponential backoff:

| Attempt | Delay After Previous Attempt | Total Time Since First Attempt |
|---------|------------------------------|--------------------------------|
| 1st     | Immediate                    | 0 seconds                      |
| 2nd     | 1 minute                     | 1 minute                       |
| 3rd     | 5 minutes                    | 6 minutes                      |
| 4th     | 30 minutes                   | 36 minutes                     |
| 5th     | 2 hours                      | 2 hours 36 minutes             |
| 6th     | 12 hours                     | 14 hours 36 minutes            |

After 6 failed attempts, the webhook is marked as permanently failed.

### What Counts as a Failure?

- HTTP status codes other than 2xx (200-299)
- Network timeouts (>30 seconds)
- Connection errors
- SSL/TLS errors

### What Counts as Success?

- Any HTTP status code in the 2xx range (200-299)
- Response received within 30 seconds

---

## Best Practices

### 1. Respond Quickly

Your webhook endpoint should return a `200 OK` response within **5 seconds**. Process the webhook asynchronously:

```typescript
// ✅ Good - Quick response, async processing
app.post('/webhook', async (req, res) => {
  // Verify signature
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid');
  }

  // Return immediately
  res.status(200).send('OK');

  // Process asynchronously
  await queue.add('process-webhook', req.body);
});

// ❌ Bad - Slow processing blocks response
app.post('/webhook', async (req, res) => {
  // Verify signature
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid');
  }

  // DON'T DO THIS - blocks for too long
  await updateDatabase(req.body);
  await sendEmailNotification(req.body);
  await updateThirdPartyAPI(req.body);

  res.status(200).send('OK'); // Too late!
});
```

### 2. Handle Duplicate Events

Webhooks may be delivered more than once. Make your processing **idempotent**:

```typescript
async function processWebhook(event) {
  // Check if already processed
  const existing = await db.webhookLog.findOne({
    eventId: event.data.job_id,
    eventType: event.event,
    timestamp: event.timestamp
  });

  if (existing) {
    console.log('Duplicate webhook, skipping');
    return;
  }

  // Process and log
  await processEvent(event);
  await db.webhookLog.create({
    eventId: event.data.job_id,
    eventType: event.event,
    timestamp: event.timestamp,
    processedAt: new Date()
  });
}
```

### 3. Log Everything

Keep detailed logs for debugging:

```typescript
app.post('/webhook', async (req, res) => {
  const logId = generateId();

  logger.info('Webhook received', {
    logId,
    event: req.body.event,
    timestamp: req.body.timestamp,
    signature: req.headers['x-jobhorizons-signature']
  });

  try {
    if (!verifySignature(req)) {
      logger.warn('Invalid signature', { logId });
      return res.status(401).send('Invalid');
    }

    logger.info('Signature verified', { logId });
    res.status(200).send('OK');

    await queue.add('process-webhook', {
      logId,
      event: req.body
    });

    logger.info('Queued for processing', { logId });
  } catch (error) {
    logger.error('Webhook error', { logId, error });
    throw error;
  }
});
```

### 4. Handle Errors Gracefully

Don't let webhook failures crash your application:

```typescript
async function processWebhook(event) {
  try {
    switch (event.event) {
      case 'job.created':
        await handleJobCreated(event.data);
        break;
      case 'proposal.submitted':
        await handleProposalSubmitted(event.data);
        break;
      // ... other events
      default:
        logger.warn('Unknown event type', { event: event.event });
    }
  } catch (error) {
    logger.error('Failed to process webhook', {
      event: event.event,
      error: error.message,
      stack: error.stack
    });

    // Optionally: Send to error tracking (Sentry, etc.)
    // DO NOT re-throw - webhook is lost if handler fails
  }
}
```

---

## Testing

### 1. Test Webhook Button

Use the **Test** button in the dashboard to send a test webhook with sample data.

### 2. Local Development with ngrok

```bash
# Start ngrok to expose local server
ngrok http 3000

# Use the ngrok URL in your webhook configuration
# https://abc123.ngrok.io/webhooks/jobhorizons
```

### 3. Manual Curl Test

```bash
# Calculate signature
SECRET="your_webhook_secret"
PAYLOAD='{"event":"job.created","timestamp":"2025-11-11T00:00:00Z","data":{"job_id":"test-123"}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Send test request
curl -X POST https://your-domain.com/webhooks/jobhorizons \
  -H "Content-Type: application/json" \
  -H "X-JobHorizons-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### 4. Test Signature Verification

```typescript
import crypto from 'crypto';

const secret = 'your_webhook_secret';
const payload = {
  event: 'job.created',
  timestamp: '2025-11-11T00:00:00Z',
  data: { job_id: 'test-123' }
};

const payloadString = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', secret)
  .update(payloadString)
  .digest('hex');

console.log('Signature:', signature);

// Test verification
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(signature) // In real scenario, this comes from header
);

console.log('Valid:', isValid); // Should be true
```

---

## Troubleshooting

### Webhook Not Received

1. **Check webhook status** - Is it active?
2. **Verify HTTPS** - HTTP URLs are rejected
3. **Check firewall** - Ensure your server accepts incoming requests
4. **Review logs** - Check the delivery logs in dashboard

### Invalid Signature Errors

1. **Check secret** - Ensure you're using the correct secret
2. **Verify payload** - Must use raw request body, not parsed JSON
3. **Check encoding** - Payload should be UTF-8 string
4. **Timing issues** - Use `crypto.timingSafeEqual()` to prevent timing attacks

### Webhook Failures

1. **Respond quickly** - Return 200 OK within 5 seconds
2. **Check timeout** - Webhooks timeout after 30 seconds
3. **Review status codes** - Only 2xx codes count as success
4. **SSL errors** - Ensure valid SSL certificate

---

## Support

Need help with webhooks?

- **Documentation**: This guide
- **Dashboard**: View webhook logs at `/dashboard?tab=webhooks`
- **Support**: Contact support@yourdomain.com

---

## Changelog

**2025-11-11**: Initial webhook system documentation
- Added 10 event types
- Signature verification examples in 5 languages
- Retry policy documentation
- Best practices guide
