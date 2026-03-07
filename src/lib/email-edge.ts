// Email utility using Supabase Edge Function
// All SMTP credentials are stored securely in Supabase secrets

interface EmailRequest {
  to: string
  template: 'welcome' | 'verification' | 'passwordReset' | 'paymentSuccess' | 'supportTicketCreated' | 'supportTicketResponse' | 'fraudDetected' | 'accountSuspended' | 'adminFraudAlert' | 'proposalReceived' | 'proposalAccepted' | 'interviewInvitation' | 'teamInvitation' | 'newMessage'
  templateData: {
    firstName?: string
    verificationLink?: string
    resetLink?: string
    amount?: number
    planName?: string
    ticketNumber?: string
    ticketSubject?: string
    userEmail?: string
    trustScore?: number
    flagReasons?: string[]
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

export async function sendEmail(options: EmailRequest): Promise<boolean> {
  try {
    // Get environment variables at runtime
    // Support both client-side (NEXT_PUBLIC_*) and server-side variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      return false;
    }

    if (!supabaseAnonKey) {
      return false;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(options),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

export const emailTemplates = {
  async sendSupportTicketCreatedEmail(
    to: string,
    ticketNumber: string,
    subject: string,
    firstName?: string
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'supportTicketCreated',
      templateData: {
        firstName,
        ticketNumber,
        ticketSubject: subject,
      },
    });
  },

  async sendAccountSuspendedEmail(
    to: string,
    trustScore: number,
    flagReasons: string[]
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'accountSuspended',
      templateData: {
        trustScore,
        flagReasons,
      },
    });
  },

  async sendFraudDetectedEmail(
    to: string,
    trustScore: number,
    flagReasons: string[],
    firstName?: string
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'fraudDetected',
      templateData: {
        firstName,
        trustScore,
        flagReasons,
      },
    });
  },

  async paymentSuccessEmail(
    to: string,
    amount: number,
    planName: string
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'paymentSuccess',
      templateData: {
        amount,
        planName,
      },
    });
  },

  async sendProposalReceivedEmail(
    to: string,
    jobTitle: string,
    freelancerName: string,
    jobLink: string
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'proposalReceived',
      templateData: {
        jobTitle,
        freelancerName,
        jobLink,
      },
    });
  },

  async sendProposalAcceptedEmail(
    to: string,
    jobTitle: string,
    clientName: string,
    jobLink: string
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'proposalAccepted',
      templateData: {
        jobTitle,
        clientName,
        jobLink,
      },
    });
  },

  async sendNewMessageEmail(
    to: string,
    senderName: string,
    messagePreview: string,
    conversationLink: string
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'newMessage',
      templateData: {
        senderName,
        messagePreview,
        conversationLink,
      },
    });
  },

  async sendTeamInvitationEmail(
    to: string,
    inviterName: string,
    organizationName: string,
    role: string,
    invitationLink: string
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'teamInvitation',
      templateData: {
        inviterName,
        organizationName,
        role,
        invitationLink,
      },
    });
  },

  async verificationApprovedEmail(
    to: string,
    firstName?: string
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'verification',
      templateData: {
        firstName,
      },
    });
  },

  async verificationRejectedEmail(
    to: string,
    firstName?: string,
    reason?: string
  ): Promise<boolean> {
    return sendEmail({
      to,
      template: 'verification',
      templateData: {
        firstName,
      },
    });
  },
};

export async function sendInterviewInvitation(
  to: string,
  jobTitle: string,
  scheduledAt: string,
  duration: number,
  meetingLink?: string,
  platform?: string,
  notes?: string
): Promise<boolean> {
  return sendEmail({
    to,
    template: 'interviewInvitation',
    templateData: {
      jobTitle,
      scheduledAt,
      duration,
      meetingLink,
      platform,
      notes,
    },
  });
}
