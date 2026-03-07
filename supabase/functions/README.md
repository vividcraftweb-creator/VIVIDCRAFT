# Supabase Edge Functions

## Setup

### 1. Set Supabase Secrets

Run these commands to set up your SMTP credentials as secrets:

```bash
# Set SMTP credentials
npx supabase secrets set SMTP_HOST="your-smtp-host"
npx supabase secrets set SMTP_PORT="587"
npx supabase secrets set SMTP_USER="your-smtp-user"
npx supabase secrets set SMTP_PASSWORD="your-smtp-password"
npx supabase secrets set FROM_EMAIL="support@yourdomain.com"
npx supabase secrets set NEXTAUTH_URL="https://yourdomain.com"
```

### 2. Deploy Edge Function

```bash
npx supabase functions deploy send-email --project-ref your-project-ref
```

### 3. Get Function URL

After deployment, your function will be available at:
```
https://your-project-ref.supabase.co/functions/v1/send-email
```

## Usage

### Send Email with Template

```typescript
const response = await fetch('https://your-project-ref.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    to: 'user@example.com',
    template: 'verification',
    templateData: {
      verificationLink: 'https://yourdomain.com/verify?token=...',
      firstName: 'John'
    }
  })
})
```

### Send Custom Email

```typescript
const response = await fetch('https://your-project-ref.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Custom Subject',
    html: '<p>Custom HTML content</p>',
    text: 'Custom text content'
  })
})
```

## Available Templates

- `welcome` - Welcome email for new users
- `verification` - Email verification
- `passwordReset` - Password reset email
- `paymentSuccess` - Payment confirmation

## Environment Variables (Set via Supabase Secrets)

- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password/API key
- `FROM_EMAIL` - Sender email address
- `NEXTAUTH_URL` - Application URL for links
