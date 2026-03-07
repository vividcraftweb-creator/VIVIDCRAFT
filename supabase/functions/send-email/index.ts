// Supabase Edge Function for sending emails via Brevo REST API
// Deploy with: supabase functions deploy send-email
// NOTE: Requires BREVO_API_KEY secret (not SMTP password)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  template?: 'welcome' | 'verification' | 'passwordReset' | 'paymentSuccess' | 'paymentFailed' | 'subscriptionCancellation' | 'supportTicketCreated' | 'supportTicketResponse' | 'fraudDetected' | 'accountSuspended' | 'accountRestored' | 'adminFraudAlert' | 'proposalReceived' | 'proposalAccepted' | 'interviewInvitation' | 'teamInvitation' | 'newMessage'
  templateData?: {
    firstName?: string
    verificationLink?: string
    resetLink?: string
    amount?: number
    planName?: string
    endDate?: string
    ticketNumber?: string
    ticketSubject?: string
    userEmail?: string
    trustScore?: number
    flagReasons?: string[]
    reason?: string
    responseMessage?: string
    clientName?: string
    jobTitle?: string
    jobLink?: string
    freelancerName?: string
    interviewId?: string
    scheduledAt?: string
    duration?: number
    meetingLink?: string
    platform?: string
    notes?: string
    inviterName?: string
    organizationName?: string
    role?: string
    invitationLink?: string
    senderName?: string
    messagePreview?: string
    conversationLink?: string
  }
}

// Helper function to generate .ics calendar file
function generateICS(data: {
  scheduledAt: string;
  duration: number;
  jobTitle: string;
  meetingLink: string;
  clientName: string;
  freelancerName: string;
  notes?: string;
}): string {
  const startDate = new Date(data.scheduledAt);
  const endDate = new Date(startDate.getTime() + data.duration * 60000);

  // Format dates for ICS (YYYYMMDDTHHMMSSZ)
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JobHorizons//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@${Deno.env.get("SITE_DOMAIN") ?? "yourdomain.com"}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:Interview: ${data.jobTitle}`,
    `DESCRIPTION:Interview with ${data.clientName} for ${data.jobTitle}\\n\\nJoin meeting: ${data.meetingLink}${data.notes ? `\\n\\nNotes: ${data.notes}` : ''}`,
    `LOCATION:${data.meetingLink}`,
    `STATUS:CONFIRMED`,
    `SEQUENCE:0`,
    `ORGANIZER;CN=${data.clientName}:mailto:${Deno.env.get("FROM_EMAIL") ?? "noreply@yourdomain.com"}`,
    `ATTENDEE;CN=${data.freelancerName};RSVP=TRUE:mailto:${data.freelancerName}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Interview reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

// Email templates - Clean, minimal design inspired by Cursor
const templates = {
  welcome: (firstName?: string) => ({
    subject: 'Welcome to JobHorizons',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to JobHorizons</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 16px;
            }
            .email-container {
              max-width: 480px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 40px 32px;
            }
            .logo-container {
              margin-bottom: 32px;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              display: block;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 14px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Welcome to JobHorizons${firstName ? `, ${firstName}` : ''}</h1>

                <p class="description">
                  Your account has been created successfully. You can now access your dashboard and start connecting with opportunities.
                </p>

                <a href="${Deno.env.get('NEXTAUTH_URL')}/dashboard" class="button">Go to Dashboard</a>

                <p class="footer-text">
                  If you didn't create this account, please disregard this email.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to JobHorizons\n\nWelcome${firstName ? ` ${firstName}` : ''}!\n\nYour JobHorizons account has been created successfully...`
  }),

  verification: (verificationLink: string, firstName?: string) => ({
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              max-width: 480px;
              margin: 0 auto;
              padding: 40px 32px;
            }
            .logo-container {
              margin-bottom: 32px;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              display: block;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 14px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Verify your email address</h1>

                <p class="description">
                  ${firstName ? `Hi ${firstName}, w` : 'W'}e need to verify your email address to complete your account setup. Please click the button below to confirm your email.
                </p>

                <a href="${verificationLink}" class="button">Verify Email Address</a>

                <p class="footer-text">
                  This verification link will expire in 24 hours.
                </p>

                <p class="footer-text">
                  If you didn't create this account, you can safely ignore this email.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Verify your email address\n\n${firstName ? `Hi ${firstName},\n\n` : ''}We need to verify your email address to complete your JobHorizons account setup.\n\nClick here to verify: ${verificationLink}\n\nThis link will expire in 24 hours.\n\nIf you didn't create this account, you can safely ignore this email.\n\nBest regards,\nThe JobHorizons Team`
  }),

  passwordReset: (resetLink: string, firstName?: string) => ({
    subject: 'Reset your JobHorizons password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 16px;
            }
            .email-container {
              max-width: 480px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 40px 32px;
            }
            .logo-container {
              margin-bottom: 32px;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              display: block;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 14px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Reset your password</h1>

                <p class="description">
                  ${firstName ? `Hi ${firstName}, y` : 'Y'}ou requested a password reset for your JobHorizons account. Click the button below to create a new password.
                </p>

                <a href="${resetLink}" class="button">Reset Password</a>

                <p class="footer-text">
                  This link will expire in 1 hour.
                </p>

                <p class="footer-text">
                  If you didn't request this password reset, please reach out to JobHorizons support.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Reset your password\n\nPlease visit: ${resetLink}`
  }),

  paymentSuccess: (amount: number, planName: string) => ({
    subject: 'Payment confirmation',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmation</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .info-box {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
            }
            .info-row {
              font-size: 15px;
              color: #1a1a1a;
              margin: 8px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 32px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              font-size: 15px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Payment confirmed</h1>

                <p class="description">
                  Your payment has been processed successfully.
                </p>

                <div class="info-box">
                  <div class="info-row"><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</div>
                  <div class="info-row"><strong>Plan:</strong> ${planName}</div>
                  <div class="info-row"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>

                <a href="${Deno.env.get('NEXTAUTH_URL')}/billing" class="button">View Billing Details</a>

                <p class="footer-text">
                  If you have any questions, please contact ${Deno.env.get("SUPPORT_EMAIL") ?? "support@yourdomain.com"}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Payment confirmation\n\nAmount: $${(amount / 100).toFixed(2)}\nPlan: ${planName}`
  }),

  paymentFailed: (planName: string, firstName?: string) => ({
    subject: 'Payment Failed – Please Update Your Billing Information',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Failed</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 16px;
            }
            .email-container {
              max-width: 480px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 40px 32px;
            }
            .logo-container {
              margin-bottom: 32px;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              display: block;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 14px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Payment failed</h1>

                <p class="description">
                  ${firstName ? `Hi ${firstName}, w` : 'W'}e were unable to process your ${planName} subscription payment. Please update your payment method to ensure uninterrupted access.
                </p>

                <a href="${Deno.env.get('NEXTAUTH_URL')}/dashboard/subscription" class="button">Update Payment Method</a>

                <p class="footer-text">
                  If you have any questions, please contact ${Deno.env.get("SUPPORT_EMAIL") ?? "support@yourdomain.com"}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Payment Failed – Please Update Your Billing Information\n\nHi${firstName ? ` ${firstName}` : ''},\n\nWe were unable to process your subscription payment for ${planName} due to insufficient funds or a declined transaction.\n\nPlease update your payment method at ${Deno.env.get('NEXTAUTH_URL')}/dashboard/subscription\n\nThank you,\nJobHorizons Team`
  }),

  subscriptionCancellation: (planName: string, endDate: string, firstName?: string) => ({
    subject: 'Your Subscription Has Been Cancelled',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Cancelled</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .info-box {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
              font-size: 14px;
              color: #666666;
              text-align: left;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Subscription cancelled</h1>

                <p class="description">
                  ${firstName ? `Hi ${firstName}, y` : 'Y'}our ${planName} subscription has been cancelled successfully.
                </p>

                <div class="info-box">
                  You'll continue to have access to your ${planName} features until <strong>${endDate}</strong>.<br><br>
                  After that, your account will be downgraded to the Free Plan.
                </div>

                <p class="footer-text">
                  We'd love to have you back anytime.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your Subscription Has Been Cancelled\n\nHi${firstName ? ` ${firstName}` : ''},\n\nYour ${planName} subscription has been cancelled successfully.\n\nYou'll continue to have access until ${endDate}. Recurring payments have been stopped.\n\nWe'd love to have you back anytime.\n\n– JobHorizons Team`
  }),

  subscriptionExpiringReminder: (planName: string, expirationDate: string, firstName?: string) => ({
    subject: 'Your Subscription Expires Soon – Renew Now',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Expiring Soon</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .info-box {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
              font-size: 14px;
              color: #666666;
            }
            .button {
              display: inline-block;
              padding: 12px 32px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              font-size: 15px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Subscription expiring soon</h1>

                <p class="description">
                  ${firstName ? `Hi ${firstName}, y` : 'Y'}our ${planName} subscription will expire on <strong>${expirationDate}</strong>.
                </p>

                <div class="info-box">
                  Renew now to keep your premium features and avoid any interruption to your account.
                </div>

                <a href="${Deno.env.get('NEXTAUTH_URL')}/dashboard?tab=subscription" class="button">Renew Subscription</a>

                <p class="footer-text">
                  Questions? Contact ${Deno.env.get("SUPPORT_EMAIL") ?? "support@yourdomain.com"}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your Subscription Expires Soon\n\nHi${firstName ? ` ${firstName}` : ''},\n\nYour ${planName} subscription will expire on ${expirationDate}.\n\nRenew now at ${Deno.env.get('NEXTAUTH_URL')}/dashboard?tab=subscription to keep your premium features.\n\nAfter expiration, you'll have a 3-day grace period before being downgraded to the free plan.\n\nThank you,\nJobHorizons Team`
  }),

  supportTicketCreated: (ticketNumber: string, ticketSubject: string, firstName?: string) => ({
    subject: `Support Ticket Created: ${ticketNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Support Ticket Created</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .info-box {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
              text-align: left;
            }
            .info-row {
              font-size: 15px;
              color: #1a1a1a;
              margin: 8px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Support ticket created</h1>

                <p class="description">
                  ${firstName ? `Hi ${firstName}, y` : 'Y'}our support ticket has been created successfully. Our team will review it and get back to you within 24-48 hours.
                </p>

                <div class="info-box">
                  <div class="info-row"><strong>Ticket:</strong> ${ticketNumber}</div>
                  <div class="info-row"><strong>Subject:</strong> ${ticketSubject}</div>
                  <div class="info-row"><strong>Status:</strong> Open</div>
                </div>

                <p class="footer-text">
                  You can track the status of your ticket in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Support Ticket Created\n\nTicket: ${ticketNumber}\nSubject: ${ticketSubject}`
  }),

  supportTicketResponse: (ticketNumber: string, responseMessage: string, firstName?: string) => ({
    subject: `New Response to Ticket ${ticketNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Support Ticket Response</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .response-box {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
              text-align: left;
              font-size: 15px;
              color: #1a1a1a;
              line-height: 1.6;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">New response to ticket ${ticketNumber}</h1>

                <p class="description">
                  ${firstName ? `Hi ${firstName}, o` : 'O'}ur team has responded to your support ticket.
                </p>

                <div class="response-box">
                  ${responseMessage}
                </div>

                <p class="footer-text">
                  You can view the full conversation and respond in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `New Response to ${ticketNumber}\n\n${responseMessage}`
  }),

  fraudDetected: (trustScore: number, flagReasons: string[], firstName?: string) => ({
    subject: 'Account Security Alert',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Security Alert</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .alert-box {
              background-color: #fff9e6;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
              text-align: left;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Account security alert</h1>

                <p class="description">
                  ${firstName ? `Hi ${firstName}, w` : 'W'}e've detected some unusual activity on your JobHorizons account.
                </p>

                <div class="alert-box">
                  <strong>Trust Score:</strong> ${trustScore}/100<br><br>
                  ${flagReasons.map(r => `• ${r}`).join('<br>')}
                </div>

                <p class="footer-text">
                  Please review your account activity and update your profile with accurate information.<br>
                  Contact ${Deno.env.get("SUPPORT_EMAIL") ?? "support@yourdomain.com"} if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Security Alert\n\nTrust Score: ${trustScore}/100\nReasons: ${flagReasons.join(', ')}`
  }),

  accountSuspended: (reason?: string) => ({
    subject: 'Account Suspended',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspended</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 16px;
            }
            .email-container {
              max-width: 480px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 40px 32px;
            }
            .logo-container {
              margin-bottom: 32px;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              display: block;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .alert-box {
              background-color: #ffe6e6;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
              text-align: left;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Account Suspended</h1>

                <p class="description">
                  Your JobHorizons account has been temporarily suspended.
                </p>

                ${reason ? `
                  <div class="alert-box">
                    <strong>Reason:</strong> ${reason}
                  </div>
                ` : ''}

                <p class="footer-text">
                  To appeal this decision or if you believe this is an error, please contact us at ${Deno.env.get("SUPPORT_EMAIL") ?? "support@yourdomain.com"}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Account Suspended\n\nYour JobHorizons account has been temporarily suspended.${reason ? `\n\nReason: ${reason}` : ''}\n\nTo appeal, contact ${Deno.env.get("SUPPORT_EMAIL") ?? "support@yourdomain.com"}`
  }),

  accountRestored: () => ({
    subject: 'Your JobHorizons Account Has Been Restored',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Restored</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 16px;
            }
            .email-container {
              max-width: 480px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 40px 32px;
            }
            .logo-container {
              margin-bottom: 32px;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              display: block;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .success-box {
              background-color: #f0fdf4;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 14px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Account Restored</h1>

                <p class="description">
                  Good news! Your JobHorizons account has been restored and you can now access all features.
                </p>

                <div class="success-box">
                  Your account suspension has been lifted. You can now sign in and use JobHorizons normally.
                </div>

                <a href="${Deno.env.get('NEXTAUTH_URL')}/auth/signin" class="button">Sign In to Your Account</a>

                <p class="footer-text">
                  If you have any questions, please contact ${Deno.env.get("SUPPORT_EMAIL") ?? "support@yourdomain.com"}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Account Restored\n\nGood news! Your JobHorizons account has been restored and you can now access all features.\n\nSign in at: ${Deno.env.get('NEXTAUTH_URL')}/auth/signin\n\nIf you have any questions, contact ${Deno.env.get("SUPPORT_EMAIL") ?? "support@yourdomain.com"}`
  }),

  adminFraudAlert: (userEmail: string, trustScore: number, flagReasons: string[]) => ({
    subject: `Fraud Alert: ${userEmail}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fraud Alert</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .alert-box {
              background-color: #ffe6e6;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
              text-align: left;
            }
            .button {
              display: inline-block;
              padding: 12px 32px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              font-size: 15px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Fraud detection alert</h1>

                <p class="description">
                  User account flagged: <strong>${userEmail}</strong>
                </p>

                <div class="alert-box">
                  <strong>Trust Score:</strong> ${trustScore}/100<br><br>
                  ${flagReasons.map(r => `• ${r}`).join('<br>')}
                </div>

                <a href="${Deno.env.get('NEXTAUTH_URL')}/admin/fraud-review" class="button">Review Fraud Flags</a>

                <p class="footer-text">
                  Review the user's profile and activity, then update flag status.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Fraud Alert\n\nUser: ${userEmail}\nTrust Score: ${trustScore}/100\nIssues: ${flagReasons.join(', ')}`
  }),

  proposalReceived: (clientName: string | undefined, jobTitle: string, jobLink: string, freelancerName?: string) => ({
    subject: `New proposal received for ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Proposal Received</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .highlight-box {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
              font-size: 15px;
              color: #1a1a1a;
            }
            .button {
              display: inline-block;
              padding: 12px 32px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              font-size: 15px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">New proposal received</h1>

                <p class="description">
                  ${clientName ? `Hi ${clientName}, ` : ''}${freelancerName || 'A freelancer'} just submitted a proposal for your job posting.
                </p>

                <div class="highlight-box">
                  <strong>${jobTitle}</strong>
                </div>

                <a href="${jobLink}" class="button">View Proposal</a>

                <p class="footer-text">
                  Review it now to keep the momentum going.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `You have a new proposal for ${jobTitle}. View it here: ${jobLink}`
  }),

  proposalAccepted: (freelancerName: string | undefined, jobTitle: string, jobLink: string) => ({
    subject: `Congratulations! Your proposal for ${jobTitle} was accepted`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Proposal Accepted</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .highlight-box {
              background-color: #f0fdf4;
              border: 1px solid #86efac;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
              font-size: 15px;
              color: #166534;
            }
            .button {
              display: inline-block;
              padding: 12px 32px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              font-size: 15px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">Congratulations! Your proposal was accepted</h1>

                <p class="description">
                  ${freelancerName ? `Hi ${freelancerName}, ` : ''}Great news! The client has accepted your proposal.
                </p>

                <div class="highlight-box">
                  <strong>${jobTitle}</strong>
                </div>

                <a href="${jobLink}" class="button">View Job Details</a>

                <p class="footer-text">
                  The client will reach out to you shortly to discuss next steps.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Congratulations! Your proposal for ${jobTitle} has been accepted. View job details: ${jobLink}`
  }),

  interviewInvitation: (data: {
    freelancerName?: string;
    clientName?: string;
    jobTitle?: string;
    scheduledAt?: string;
    duration?: number;
    meetingLink?: string;
    platform?: string;
    notes?: string;
  }) => {
    const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : new Date();
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const platformLabel = {
      'GOOGLE_MEET': 'Google Meet',
      'ZOOM': 'Zoom',
      'MICROSOFT_TEAMS': 'Microsoft Teams',
      'OTHER': 'Video Call'
    }[data.platform || 'OTHER'] || 'Video Call';

    return {
      subject: `Interview Scheduled: ${data.jobTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Interview Scheduled</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f5f5;
                -webkit-font-smoothing: antialiased;
              }
              .email-wrapper {
                width: 100%;
                padding: 40px 20px;
              }
              .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                border: 1px solid #e5e5e5;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                overflow: hidden;
              }
              .email-content {
                padding: 48px 40px;
                text-align: center;
              }
              .logo-container {
                text-align: left;
                margin-bottom: 32px;
              }
              .logo-box {
                display: inline-block;
                width: 48px;
                height: 48px;
                background-color: #ffffff;
                border-radius: 8px;
                padding: 8px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
              }
              .heading {
                font-size: 24px;
                font-weight: 600;
                color: #1a1a1a;
                margin: 0 0 16px 0;
                line-height: 1.3;
                text-align: center;
              }
              .description {
                font-size: 15px;
                color: #666666;
                line-height: 1.6;
                margin: 0 0 32px 0;
                text-align: center;
              }
              .info-box {
                background-color: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 24px;
                margin: 24px 0;
              }
              .info-row {
                display: flex;
                padding: 12px 0;
                border-bottom: 1px solid #e9ecef;
              }
              .info-row:last-child {
                border-bottom: none;
              }
              .info-label {
                font-weight: 600;
                color: #495057;
                width: 140px;
                flex-shrink: 0;
              }
              .info-value {
                color: #212529;
                flex: 1;
              }
              .button {
                display: inline-block;
                padding: 12px 32px;
                background-color: #000000;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                font-size: 15px;
                margin: 8px 0;
              }
              .button-container {
                text-align: center;
                margin: 24px 0;
              }
              .notes-box {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 16px;
                margin: 24px 0;
              }
              .notes-label {
                font-weight: 600;
                color: #856404;
                margin-bottom: 8px;
              }
              .notes-content {
                color: #856404;
                line-height: 1.6;
                white-space: pre-wrap;
              }
              .footer-text {
                font-size: 13px;
                color: #999999;
                line-height: 1.5;
                text-align: center;
                margin: 24px 0 0 0;
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="email-content">
                  <div class="logo-container">
                    <div class="logo-box">
                      <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                    </div>
                  </div>

                  <h1 class="heading">Interview Scheduled</h1>

                  <p class="description">
                    ${data.freelancerName ? `Hi ${data.freelancerName}, ` : ''}${data.clientName} has scheduled an interview with you for <strong>${data.jobTitle}</strong>.
                  </p>

                  <div class="info-box">
                    <div class="info-row">
                      <div class="info-label">Date:</div>
                      <div class="info-value">${formattedDate}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Time:</div>
                      <div class="info-value">${formattedTime}</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Duration:</div>
                      <div class="info-value">${data.duration || 30} minutes</div>
                    </div>
                    <div class="info-row">
                      <div class="info-label">Platform:</div>
                      <div class="info-value">${platformLabel}</div>
                    </div>
                  </div>

                  ${data.notes ? `
                    <div class="notes-box">
                      <div class="notes-label">Additional Notes:</div>
                      <div class="notes-content">${data.notes}</div>
                    </div>
                  ` : ''}

                  <div class="button-container">
                    <a href="${data.meetingLink}" class="button">Join Meeting</a>
                  </div>

                  <p class="footer-text">
                    A calendar invite (.ics file) has been attached to this email. Add it to your calendar so you don't miss the interview!
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Interview Scheduled: ${data.jobTitle}\n\nDate: ${formattedDate}\nTime: ${formattedTime}\nDuration: ${data.duration || 30} minutes\nPlatform: ${platformLabel}\n\nJoin meeting: ${data.meetingLink}\n\n${data.notes ? `Notes: ${data.notes}\n\n` : ''}A calendar invite has been attached to this email.`
    };
  },

  teamInvitation: (inviterName: string, role: string, invitationLink: string, organizationName?: string, firstName?: string) => ({
    subject: `You've been invited to join ${organizationName || 'a team'} on JobHorizons`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .info-box {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
              text-align: left;
            }
            .info-row {
              font-size: 15px;
              color: #1a1a1a;
              margin: 12px 0;
            }
            .role-badge {
              display: inline-block;
              background-color: #000000;
              color: #ffffff;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .button {
              display: inline-block;
              padding: 12px 32px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              font-size: 15px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">You've been invited to join a team</h1>

                <p class="description">
                  ${firstName ? `Hi ${firstName}, ` : ''}${inviterName} has invited you to join ${organizationName ? `<strong>${organizationName}</strong>` : 'their team'} on JobHorizons.
                </p>

                <div class="info-box">
                  <div class="info-row">
                    <strong>Invited by:</strong> ${inviterName}
                  </div>
                  ${organizationName ? `
                    <div class="info-row">
                      <strong>Organization:</strong> ${organizationName}
                    </div>
                  ` : ''}
                  <div class="info-row">
                    <strong>Your role:</strong> <span class="role-badge">${role}</span>
                  </div>
                </div>

                <p class="description">
                  Click the button below to accept the invitation and join the team.
                </p>

                <a href="${invitationLink}" class="button">Accept Invitation</a>

                <p class="footer-text">
                  This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Team Invitation\n\n${firstName ? `Hi ${firstName},\n\n` : ''}${inviterName} has invited you to join ${organizationName || 'their team'} on JobHorizons.\n\nYour role: ${role}\n\nAccept invitation: ${invitationLink}\n\nThis invitation will expire in 7 days.\n\nIf you didn't expect this invitation, you can safely ignore this email.\n\nBest regards,\nThe JobHorizons Team`
  }),

  newMessage: (senderName: string, messagePreview: string, conversationLink: string, receiverName?: string) => ({
    subject: `New message from ${senderName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Message</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              width: 100%;
              padding: 40px 20px;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              border: 1px solid #e5e5e5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              overflow: hidden;
            }
            .email-content {
              padding: 48px 40px;
              text-align: center;
            }
            .logo-container {
              margin-bottom: 32px;
              text-align: left;
            }
            .logo-box {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .heading {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 16px 0;
              line-height: 1.3;
            }
            .description {
              font-size: 15px;
              color: #666666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .message-box {
              background-color: #f8f9fa;
              border-left: 4px solid #3b82f6;
              border-radius: 8px;
              padding: 20px 24px;
              margin: 24px 0;
              text-align: left;
            }
            .message-label {
              font-size: 12px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            .message-content {
              color: #1e293b;
              font-size: 15px;
              line-height: 1.6;
              white-space: pre-wrap;
            }
            .button {
              display: inline-block;
              padding: 12px 32px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              font-size: 15px;
              margin: 8px 0 24px 0;
            }
            .footer-text {
              font-size: 13px;
              color: #999999;
              line-height: 1.5;
              margin: 16px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="email-content">
                <div class="logo-container">
                  <div class="logo-box">
                    <img src="${Deno.env.get("SITE_URL") ?? "https://yourdomain.com"}/email-logo.png" alt="JobHorizons" />
                  </div>
                </div>

                <h1 class="heading">New message from ${senderName}</h1>

                <p class="description">
                  ${receiverName ? `Hi ${receiverName}, ` : ''}You have received a new message on JobHorizons.
                </p>

                <div class="message-box">
                  <div class="message-label">Message Preview</div>
                  <div class="message-content">${messagePreview}</div>
                </div>

                <a href="${conversationLink}" class="button">View Message</a>

                <p class="footer-text">
                  Reply directly from your dashboard to continue the conversation.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `New message from ${senderName}\n\n${receiverName ? `Hi ${receiverName},\n\n` : ''}You have received a new message on JobHorizons.\n\nMessage Preview:\n${messagePreview}\n\nView and reply to this message: ${conversationLink}\n\nBest regards,\nThe JobHorizons Team`
  })
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const emailRequest: EmailRequest = await req.json()

    // Get Brevo API credentials from Supabase secrets
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL')

    if (!BREVO_API_KEY || !FROM_EMAIL) {
      throw new Error('Brevo API configuration missing')
    }

    // Generate email content from template if specified
    let subject = emailRequest.subject
    let html = emailRequest.html
    let text = emailRequest.text

    if (emailRequest.template && emailRequest.templateData) {
      const { template, templateData } = emailRequest

      if (template === 'welcome') {
        const generated = templates.welcome(templateData.firstName)
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'verification' && templateData.verificationLink) {
        const generated = templates.verification(templateData.verificationLink, templateData.firstName)
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'passwordReset' && templateData.resetLink) {
        const generated = templates.passwordReset(templateData.resetLink, templateData.firstName)
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'paymentSuccess' && templateData.amount && templateData.planName) {
        const generated = templates.paymentSuccess(templateData.amount, templateData.planName)
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'paymentFailed' && templateData.planName) {
        const generated = templates.paymentFailed(templateData.planName, templateData.firstName)
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'subscriptionCancellation' && templateData.planName && templateData.endDate) {
        const generated = templates.subscriptionCancellation(templateData.planName, templateData.endDate, templateData.firstName)
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'supportTicketCreated' && templateData.ticketNumber && templateData.ticketSubject) {
        const generated = templates.supportTicketCreated(
          templateData.ticketNumber,
          templateData.ticketSubject,
          templateData.firstName
        )
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'supportTicketResponse' && templateData.ticketNumber && templateData.responseMessage) {
        const generated = templates.supportTicketResponse(
          templateData.ticketNumber,
          templateData.responseMessage,
          templateData.firstName
        )
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'fraudDetected' && templateData.trustScore !== undefined && templateData.flagReasons) {
        const generated = templates.fraudDetected(
          templateData.trustScore,
          templateData.flagReasons,
          templateData.firstName
        )
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'accountSuspended') {
        const generated = templates.accountSuspended(templateData.reason)
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'accountRestored') {
        const generated = templates.accountRestored()
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'adminFraudAlert' && templateData.userEmail && templateData.trustScore !== undefined && templateData.flagReasons) {
        const generated = templates.adminFraudAlert(
          templateData.userEmail,
          templateData.trustScore,
          templateData.flagReasons
        )
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'proposalReceived' && templateData.jobTitle && templateData.jobLink) {
        const generated = templates.proposalReceived(
          templateData.clientName,
          templateData.jobTitle,
          templateData.jobLink,
          templateData.freelancerName
        )
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'proposalAccepted' && templateData.jobTitle && templateData.jobLink) {
        const generated = templates.proposalAccepted(
          templateData.freelancerName,
          templateData.jobTitle,
          templateData.jobLink
        )
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'interviewInvitation' && templateData.scheduledAt && templateData.jobTitle) {
        const generated = templates.interviewInvitation({
          freelancerName: templateData.freelancerName,
          clientName: templateData.clientName,
          jobTitle: templateData.jobTitle,
          scheduledAt: templateData.scheduledAt,
          duration: templateData.duration || 30,
          meetingLink: templateData.meetingLink || '',
          platform: templateData.platform,
          notes: templateData.notes
        })
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'teamInvitation' && templateData.inviterName && templateData.role && templateData.invitationLink) {
        const generated = templates.teamInvitation(
          templateData.inviterName,
          templateData.role,
          templateData.invitationLink,
          templateData.organizationName,
          templateData.firstName
        )
        subject = generated.subject
        html = generated.html
        text = generated.text
      } else if (template === 'newMessage' && templateData.senderName && templateData.messagePreview && templateData.conversationLink) {
        const generated = templates.newMessage(
          templateData.senderName,
          templateData.messagePreview,
          templateData.conversationLink,
          templateData.firstName
        )
        subject = generated.subject
        html = generated.html
        text = generated.text
      }
    }

    // Send email using Brevo REST API
    const emailData: any = {
      sender: { email: FROM_EMAIL, name: "JobHorizons" },
      to: [{ email: emailRequest.to }],
      subject,
      htmlContent: html,
      textContent: text || html.replace(/<[^>]*>/g, ''),
    }

    // Add .ics calendar attachment for interview invitations
    if (emailRequest.template === 'interviewInvitation' && emailRequest.templateData && emailRequest.templateData.scheduledAt && emailRequest.templateData.jobTitle) {
      const icsContent = generateICS({
        scheduledAt: emailRequest.templateData.scheduledAt,
        duration: emailRequest.templateData.duration || 30,
        jobTitle: emailRequest.templateData.jobTitle,
        meetingLink: emailRequest.templateData.meetingLink || '',
        clientName: emailRequest.templateData.clientName || 'Client',
        freelancerName: emailRequest.templateData.freelancerName || emailRequest.to,
        notes: emailRequest.templateData.notes
      });

      // Convert ICS content to base64 for Brevo attachment
      const icsBase64 = btoa(icsContent);

      emailData.attachment = [{
        content: icsBase64,
        name: 'interview.ics'
      }];
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email via Brevo API: ${error}`)
    }

    const result = await response.json()

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 500,
    })
  }
})
