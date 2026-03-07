import { createAdminClient } from '@/lib/supabase/server';
import { emailTemplates } from '@/lib/email-edge';
import type { Json } from '@/types/database.types';

export interface FraudCheckResult {
  isFlagged: boolean;
  flags: Array<{
    type: string;
    severity: number;
    reason: string;
    metadata?: Record<string, Json>;
  }>;
  trustScore: number; // 0-100
  recommendedAction: 'none' | 'verify' | 'suspend';
}

// Comprehensive list of disposable email domains (150+ domains)
const DISPOSABLE_EMAIL_DOMAINS = [
  // Original domains
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email',
  'mailinator.com', 'temp-mail.org', 'trashmail.com', 'yopmail.com',
  'fakeinbox.com', 'maildrop.cc',

  // Common disposable services
  'getairmail.com', 'mailnesia.com', 'mintemail.com', 'getnada.com',
  'tempmailaddress.com', 'sharklasers.com', 'guerrillamailblock.com',
  'pokemail.net', 'spam4.me', 'trashmail.net', 'tempinbox.com',
  'mytemp.email', 'mohmal.com', 'emltmp.com', 'trbvm.com',

  // Mailinator family
  'mailinatoralias.com', 'safetymail.info', 'binkmail.com', 'spamherelots.com',
  'thisisnotmyrealemail.com', 'tradermail.info', 'veryrealemail.com',

  // International/Regional services
  'tempmail.de', 'wegwerfmail.de', 'trashmail.de', 'byom.de',
  'trash-mail.at', 'wegwerfemail.de', 'spambog.com', 'disposableemailaddresses.com',

  // Short-lived providers
  'minuteinbox.com', '20minutemail.com', '30minutemail.com', 'emailondeck.com',
  'throwawaymail.com', 'tempmail.net', 'tmail.ws', 'dispostable.com',
  'incognitomail.org', 'anonymousemail.me', 'deadaddress.com',

  // Burner email services
  'burnermail.io', 'emailsensei.com', 'burner.today', 'jetable.org',
  'kasmail.com', 'spambox.us', 'filzmail.com', 'armyspy.com',

  // Privacy/Anonymous services
  'anonbox.net', 'mailnull.com', 'mt2014.com', 'mt2015.com', 'mt2017.com',
  'maildx.com', 'mailforspam.com', 'spamfree24.org', 'spamgourmet.com',

  // Developer/Testing domains
  'example.com', 'test.com', 'localhost.com', 'devnull.com',
  'mailcatch.com', 'mailsac.com', 'putsbox.com',

  // Recently popular services
  'inboxkitten.com', 'fakermail.com', 'tmpmail.net', 'tmpmail.org',
  'tmpeml.info', 'tmails.net', 'emailfake.com', 'fake-mail.ml',
  'fakemail.net', 'harakirimail.com', 'meltmail.com', 'owlpic.com',

  // Self-destructing email
  'destructingmessage.com', 'selfdestructingmail.com', 'mailexpire.com',

  // Forwarding/Alias services often used for spam
  '33mail.com', 'anonaddy.com', 'simplelogin.io', 'relay.firefox.com',

  // International variants
  'moakt.com', 'moakt.ws', 'cuvox.de', 'einrot.com', 'fleckens.hu',
  'gustr.com', 'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us',

  // Additional common disposable
  'mailbox2go.com', 'mailbox.in.ua', 'email-fake.com', 'freemail.ms',
  'mvrht.com', 'nada.email', 'nomail.pw', 'notmailinator.com',
  'qoika.com', 'rtrtr.com', 'spambox.xyz', 'spamcowboy.com',
  'spamify.com', 'spammotel.com', 'temporaryemail.net', 'throwam.com',
  'tmmbt.net', 'vpn.st', 'wuzup.net', 'wuzupmail.net', 'zehnminuten.de',

  // Less common but still used
  'guerillamail.net', 'guerillamail.org', 'guerillamail.biz',
  'sharklasers.io', 'guerrillamail.de', 'grr.la', 'guerrillamail.info',
  'spam4.us', 'tafmail.com', 'tmail.com', 'bugmenot.com',
  'trbvm.org', 'cloudns.cc', 'mailtemp.info', 'tempr.email',
  'protonmail.com.temp', 'enayu.com', 'maxmail.in', 'mailboxcool.net',

  // Catch-all patterns often used
  'gawab.com', 'cmail.org', 'zmail.top', 'emlhub.com', 'inboxes.com',
  'yopmail.net', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr'
];

/**
 * Check if an email is from a disposable email provider
 */
function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.some(disposable => domain?.includes(disposable));
}

/**
 * Calculate similarity between two strings (Levenshtein distance)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Check for duplicate or similar portfolio content
 */
async function checkDuplicatePortfolio(userId: string, profileId: string): Promise<{
  isDuplicate: boolean;
  similarProfiles: Array<{ profileId: string; similarity: number }>;
}> {
  try {
    const supabase = createAdminClient();

    const { data: currentProfile, error: profileError } = await supabase
      .from('Profile')
      .select('*, portfolioItems:PortfolioItem(*)')
      .eq('id', profileId)
      .single();

    if (profileError || !currentProfile || !currentProfile.portfolioItems?.length) {
      return { isDuplicate: false, similarProfiles: [] };
    }

    // Get other profiles with portfolios
    const { data: otherProfiles, error: otherError } = await supabase
      .from('Profile')
      .select('*, portfolioItems:PortfolioItem(*)')
      .neq('userId', userId)
      .not('portfolioItems', 'is', null)
      .limit(100);

    const similarProfiles: Array<{ profileId: string; similarity: number }> = [];

    if (otherError || !otherProfiles) {
      return { isDuplicate: false, similarProfiles: [] };
    }

    for (const otherProfile of otherProfiles) {
      let totalSimilarity = 0;
      let comparisonCount = 0;

      for (const currentItem of currentProfile.portfolioItems) {
        for (const otherItem of otherProfile.portfolioItems) {
          const titleSimilarity = calculateSimilarity(
            currentItem.title.toLowerCase(),
            otherItem.title.toLowerCase()
          );

          const descSimilarity = currentItem.description && otherItem.description
            ? calculateSimilarity(
                currentItem.description.toLowerCase(),
                otherItem.description.toLowerCase()
              )
            : 0;

          const avgSimilarity = (titleSimilarity + descSimilarity) / 2;
          totalSimilarity += avgSimilarity;
          comparisonCount++;
        }
      }

      if (comparisonCount > 0) {
        const avgProfileSimilarity = totalSimilarity / comparisonCount;
        if (avgProfileSimilarity > 80) {
          similarProfiles.push({
            profileId: otherProfile.id,
            similarity: avgProfileSimilarity,
          });
        }
      }
    }

    return {
      isDuplicate: similarProfiles.length > 0,
      similarProfiles,
    };
  } catch (error) {
    return { isDuplicate: false, similarProfiles: [] };
  }
}

async function checkMultipleSignupsFromIP(
  ip: string,
  userId: string
): Promise<{ count: number; userIds: string[] }> {
  try {
    const supabase = createAdminClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: users, error } = await supabase
      .from('User')
      .select('id')
      .eq('signupIp', ip)
      .neq('id', userId)
      .gte('createdAt', sevenDaysAgo);

    if (error || !users) {
      return { count: 0, userIds: [] };
    }

    return { count: users.length, userIds: users.map(u => u.id) };
  } catch (error) {
    return { count: 0, userIds: [] };
  }
}

/**
 * Check profile quality
 */
async function checkProfileQuality(userId: string): Promise<{
  isLowQuality: boolean;
  issues: string[];
}> {
  try {
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from('User')
      .select(`
        *,
        profile:Profile(
          *,
          portfolioItems:PortfolioItem(*),
          experienceItems:ExperienceItem(*),
          educationItems:EducationItem(*)
        )
      `)
      .eq('id', userId)
      .single();

    const profile = Array.isArray(user?.profile) ? user.profile[0] : user?.profile;

    if (error || !user || !profile) {
      return { isLowQuality: true, issues: ['Profile not created'] };
    }

    const issues: string[] = [];

    // Check bio
    if (!profile.bio || profile.bio.length < 50) {
      issues.push('Bio too short or missing');
    }

    // Check if bio contains suspicious patterns
    if (profile.bio) {
      const suspiciousPatterns = [
        /test/i,
        /asdf/i,
        /qwerty/i,
        /lorem ipsum/i,
        /fake/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(profile.bio)) {
          issues.push('Bio contains suspicious text');
          break;
        }
      }
    }

    // Check skills
    const skillsArray =
      profile.skills?.split(',')
        .map((skill: string) => skill.trim())
        .filter((skill: string): skill is string => skill.length > 0) || [];
    if (skillsArray.length < 3) {
      issues.push('Too few skills listed');
    }

    // Check portfolio
    if (!profile.portfolioItems || profile.portfolioItems.length === 0) {
      issues.push('No portfolio items');
    }

    // Check profile completeness
    if (!profile.profilePicture) {
      issues.push('No profile picture');
    }

    if (!profile.title) {
      issues.push('No professional title');
    }

    return {
      isLowQuality: issues.length >= 3, // Flag if 3 or more issues
      issues,
    };
  } catch (error) {
    return { isLowQuality: false, issues: [] };
  }
}

async function checkRapidProposals(
  userId: string
): Promise<{ isRapid: boolean; count: number }> {
  try {
    const supabase = createAdminClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('Proposal')
      .select('*', { count: 'exact', head: true })
      .eq('freelancerId', userId)
      .gte('createdAt', oneDayAgo);

    if (error) {
      return { isRapid: false, count: 0 };
    }

    return { isRapid: (count || 0) > 10, count: count || 0 };
  } catch (error) {
    return { isRapid: false, count: 0 };
  }
}

/**
 * Check for rapid activity after account creation (new accounts with instant proposals/messages)
 */
async function checkRapidActivity(
  userId: string
): Promise<{ isSuspicious: boolean; severity: number; reason: string }> {
  try {
    const supabase = createAdminClient();

    // Get user creation time
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('createdAt, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return { isSuspicious: false, severity: 0, reason: '' };
    }

    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const oneHour = 60 * 60 * 1000;
    const sixHours = 6 * oneHour;
    const twentyFourHours = 24 * oneHour;

    // Check proposals (for freelancers)
    if (user.role === 'FREELANCER') {
      const { count: proposalCount } = await supabase
        .from('Proposal')
        .select('*', { count: 'exact', head: true })
        .eq('freelancerId', userId);

      if (accountAge < oneHour && (proposalCount || 0) > 0) {
        return {
          isSuspicious: true,
          severity: 8,
          reason: `Account created less than 1 hour ago but already submitted ${proposalCount} proposal(s)`,
        };
      }

      if (accountAge < twentyFourHours && (proposalCount || 0) >= 5) {
        return {
          isSuspicious: true,
          severity: 6,
          reason: `Account less than 24 hours old but already submitted ${proposalCount} proposals`,
        };
      }
    }

    // Check messages (all users)
    const { count: messageCount } = await supabase
      .from('Message')
      .select('*', { count: 'exact', head: true })
      .eq('senderId', userId);

    if (accountAge < sixHours && (messageCount || 0) >= 3) {
      return {
        isSuspicious: true,
        severity: 7,
        reason: `Account less than 6 hours old but already sent ${messageCount} messages`,
      };
    }

    return { isSuspicious: false, severity: 0, reason: '' };
  } catch (error) {
    return { isSuspicious: false, severity: 0, reason: '' };
  }
}

/**
 * Check for impossible travel (IP subnet changes within short time period)
 */
async function checkImpossibleTravel(
  userId: string
): Promise<{ isImpossible: boolean; reason: string }> {
  try {
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from('User')
      .select('signupIp, lastLoginIp, lastLoginAt, createdAt')
      .eq('id', userId)
      .single();

    if (error || !user || !user.signupIp || !user.lastLoginIp) {
      return { isImpossible: false, reason: '' };
    }

    // Extract first 3 octets (subnet) from IPs
    const getSubnet = (ip: string) => ip.split('.').slice(0, 3).join('.');
    const signupSubnet = getSubnet(user.signupIp);
    const loginSubnet = getSubnet(user.lastLoginIp);

    // If subnets are different, check time difference
    if (signupSubnet !== loginSubnet) {
      const timeSinceSignup = user.lastLoginAt
        ? new Date(user.lastLoginAt).getTime() - new Date(user.createdAt).getTime()
        : 0;

      const oneHour = 60 * 60 * 1000;

      if (timeSinceSignup < oneHour) {
        return {
          isImpossible: true,
          reason: `IP subnet changed from ${signupSubnet}.x to ${loginSubnet}.x within 1 hour of account creation`,
        };
      }
    }

    return { isImpossible: false, reason: '' };
  } catch (error) {
    return { isImpossible: false, reason: '' };
  }
}

/**
 * Scan content for scam patterns and keywords
 */
export async function scanContentForScams(
  content: string
): Promise<{ isFlagged: boolean; severity: number; matches: string[]; reason: string }> {
  if (!content || content.trim().length === 0) {
    return { isFlagged: false, severity: 0, matches: [], reason: '' };
  }

  const contentLower = content.toLowerCase();
  const matches: string[] = [];

  // Payment scam keywords
  const paymentScams = [
    'western union', 'moneygram', 'bitcoin', 'cryptocurrency', 'crypto',
    'wire transfer', 'bank transfer', 'cashapp', 'venmo', 'paypal.me',
    'zelle', 'wire money', 'send money', 'advance payment', 'upfront payment'
  ];

  // External contact attempts
  const externalContact = [
    'whatsapp', 'telegram', 'wechat', 'signal app', 'skype',
    'email me at', 'contact me at', 'reach me at', 'gmail.com',
    'yahoo.com', 'hotmail.com', 'outlook.com', '@'
  ];

  // Urgency tactics
  const urgencyTactics = [
    'urgent', 'asap', 'immediately', 'right now', 'hurry',
    'limited time', 'expires soon', 'act now', 'don\'t wait'
  ];

  // Suspicious phrases
  const suspiciousPhrases = [
    'processing fee', 'verification fee', 'advance fee', 'registration fee',
    'guaranteed', '100% success', 'risk free', 'no risk',
    'click here', 'click this link', 'act now'
  ];

  // URL shorteners and suspicious links
  const urlPatterns = [
    /bit\.ly/i, /tinyurl\.com/i, /goo\.gl/i, /ow\.ly/i,
    /t\.co/i, /short\.link/i, /rb\.gy/i
  ];

  // Phone number patterns (international formats)
  const phonePattern = /(\+?[\d\s\-()]{10,})/g;

  // Check each category
  for (const keyword of paymentScams) {
    if (contentLower.includes(keyword)) {
      matches.push(`Payment scam: "${keyword}"`);
    }
  }

  for (const keyword of externalContact) {
    if (contentLower.includes(keyword)) {
      matches.push(`External contact: "${keyword}"`);
    }
  }

  for (const keyword of urgencyTactics) {
    if (contentLower.includes(keyword)) {
      matches.push(`Urgency tactic: "${keyword}"`);
    }
  }

  for (const keyword of suspiciousPhrases) {
    if (contentLower.includes(keyword)) {
      matches.push(`Suspicious phrase: "${keyword}"`);
    }
  }

  for (const pattern of urlPatterns) {
    if (pattern.test(content)) {
      matches.push(`URL shortener detected`);
    }
  }

  const phoneMatches = content.match(phonePattern);
  if (phoneMatches && phoneMatches.length > 0) {
    matches.push(`Phone number detected: ${phoneMatches[0]}`);
  }

  // Determine severity based on match count
  const matchCount = matches.length;
  let severity = 0;
  let isFlagged = false;

  if (matchCount >= 5) {
    severity = 9;
    isFlagged = true;
  } else if (matchCount >= 3) {
    severity = 7;
    isFlagged = true;
  } else if (matchCount >= 1) {
    severity = 5;
    isFlagged = true;
  }

  return {
    isFlagged,
    severity,
    matches,
    reason: matchCount > 0
      ? `Detected ${matchCount} potential scam indicator(s): ${matches.slice(0, 3).join(', ')}`
      : '',
  };
}

/**
 * Check for cross-account linking (duplicate/related accounts)
 */
async function checkCrossAccountLinking(
  userId: string,
  email: string,
  signupIp?: string
): Promise<{ hasLinkedAccounts: boolean; linkedAccountIds: string[]; reason: string }> {
  try {
    const supabase = createAdminClient();
    const linkedIds: string[] = [];
    const reasons: string[] = [];

    // Check for email similarity (same base email with +tags)
    const emailBase = email.split('+')[0]?.split('@')[0];
    const emailDomain = email.split('@')[1];

    if (emailBase && emailDomain) {
      const { data: similarEmailUsers } = await supabase
        .from('User')
        .select('id')
        .neq('id', userId)
        .ilike('email', `${emailBase}%@${emailDomain}`);

      if (similarEmailUsers && similarEmailUsers.length > 0) {
        linkedIds.push(...similarEmailUsers.map(u => u.id));
        reasons.push(`${similarEmailUsers.length} account(s) with similar email pattern`);
      }
    }

    // Check for same IP signups within 30 days
    if (signupIp) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: sameIpUsers } = await supabase
        .from('User')
        .select('id')
        .eq('signupIp', signupIp)
        .neq('id', userId)
        .gte('createdAt', thirtyDaysAgo);

      if (sameIpUsers && sameIpUsers.length > 0) {
        const newLinked = sameIpUsers.filter(u => !linkedIds.includes(u.id));
        linkedIds.push(...newLinked.map(u => u.id));
        reasons.push(`${sameIpUsers.length} account(s) from same IP in last 30 days`);
      }
    }

    // Get user profile for name comparison
    const { data: currentUser } = await supabase
      .from('User')
      .select('profile:Profile(firstName, lastName, bio)')
      .eq('id', userId)
      .single();

    const currentProfile = Array.isArray(currentUser?.profile) ? currentUser.profile[0] : currentUser?.profile;

    if (currentProfile?.firstName && currentProfile?.lastName) {
      // Check for name similarity using Levenshtein distance
      const { data: otherUsers } = await supabase
        .from('User')
        .select('id, profile:Profile(firstName, lastName)')
        .neq('id', userId)
        .limit(100);

      if (otherUsers) {
        for (const user of otherUsers) {
          const profile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
          if (!profile?.firstName || !profile?.lastName) continue;

          const firstNameSim = calculateSimilarity(
            currentProfile.firstName.toLowerCase(),
            profile.firstName.toLowerCase()
          );
          const lastNameSim = calculateSimilarity(
            currentProfile.lastName.toLowerCase(),
            profile.lastName.toLowerCase()
          );

          // If both names are very similar (< 3 character differences)
          if (firstNameSim > 70 && lastNameSim > 70 && !linkedIds.includes(user.id)) {
            linkedIds.push(user.id);
            reasons.push(`Similar name to another account`);
          }
        }
      }
    }

    // Remove duplicates
    const uniqueLinkedIds = [...new Set(linkedIds)];

    return {
      hasLinkedAccounts: uniqueLinkedIds.length > 0,
      linkedAccountIds: uniqueLinkedIds,
      reason: reasons.length > 0 ? reasons.join('; ') : '',
    };
  } catch (error) {
    return { hasLinkedAccounts: false, linkedAccountIds: [], reason: '' };
  }
}

/**
 * Main fraud detection function
 */
export async function runFraudDetection(
  userId: string,
  signupIp?: string
): Promise<FraudCheckResult> {
  const flags: FraudCheckResult['flags'] = [];
  let trustScore = 100;

  try {
    const supabase = createAdminClient();

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*, profile:Profile(*)')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // 1. Check disposable email
    if (isDisposableEmail(user.email)) {
      flags.push({
        type: 'DISPOSABLE_EMAIL',
        severity: 7,
        reason: 'User registered with a disposable email address',
        metadata: { email: user.email },
      });
      trustScore -= 25;
    }

    // 2. Check multiple signups from same IP
    if (signupIp || user.signupIp) {
      const ipCheck = await checkMultipleSignupsFromIP(
        signupIp || user.signupIp || '',
        userId
      );
      if (ipCheck.count >= 3) {
        flags.push({
          type: 'MULTIPLE_SIGNUPS_SAME_IP',
          severity: 8,
          reason: `${ipCheck.count} accounts created from the same IP in the last 7 days`,
          metadata: { count: ipCheck.count, ip: signupIp || user.signupIp },
        });
        trustScore -= 30;
      }
    }

    // 3. Check profile quality
    const qualityCheck = await checkProfileQuality(userId);
    if (qualityCheck.isLowQuality) {
      flags.push({
        type: 'LOW_QUALITY_PROFILE',
        severity: 5,
        reason: `Profile has multiple quality issues: ${qualityCheck.issues.join(', ')}`,
        metadata: { issues: qualityCheck.issues },
      });
      trustScore -= 15;
    }

    // 4. Check for duplicate portfolio (only if profile exists)
    const profile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
    if (profile) {
      const duplicateCheck = await checkDuplicatePortfolio(userId, profile.id);
      if (duplicateCheck.isDuplicate) {
        flags.push({
          type: 'DUPLICATE_PORTFOLIO',
          severity: 9,
          reason: `Portfolio content is highly similar to ${duplicateCheck.similarProfiles.length} other profile(s)`,
          metadata: {
            similarProfiles: duplicateCheck.similarProfiles,
          },
        });
        trustScore -= 35;
      }
    }

    // 5. Check for rapid proposals (only for freelancers)
    if (user.role === 'FREELANCER') {
      const rapidCheck = await checkRapidProposals(userId);
      if (rapidCheck.isRapid) {
        flags.push({
          type: 'RAPID_PROPOSALS',
          severity: 6,
          reason: `Submitted ${rapidCheck.count} proposals in the last 24 hours`,
          metadata: { count: rapidCheck.count },
        });
        trustScore -= 20;
      }
    }

    // 6. Check for rapid activity (new accounts with instant proposals/messages)
    const activityCheck = await checkRapidActivity(userId);
    if (activityCheck.isSuspicious) {
      flags.push({
        type: 'RAPID_ACTIVITY',
        severity: activityCheck.severity,
        reason: activityCheck.reason,
        metadata: { accountAge: Date.now() - new Date(user.createdAt).getTime() },
      });
      trustScore -= 20;
    }

    // 7. Check for impossible travel (IP subnet changes)
    const travelCheck = await checkImpossibleTravel(userId);
    if (travelCheck.isImpossible) {
      flags.push({
        type: 'IMPOSSIBLE_TRAVEL',
        severity: 8,
        reason: travelCheck.reason,
        metadata: { signupIp: user.signupIp, lastLoginIp: user.lastLoginIp },
      });
      trustScore -= 25;
    }

    // 8. Check for cross-account linking
    const linkingCheck = await checkCrossAccountLinking(
      userId,
      user.email,
      signupIp || user.signupIp
    );
    if (linkingCheck.hasLinkedAccounts) {
      flags.push({
        type: 'LINKED_ACCOUNTS',
        severity: 8,
        reason: linkingCheck.reason,
        metadata: { linkedAccountIds: linkingCheck.linkedAccountIds },
      });
      trustScore -= 30;

      // Update user's linkedAccountIds in database
      await supabase
        .from('User')
        .update({ linkedAccountIds: linkingCheck.linkedAccountIds })
        .eq('id', userId);
    }

    // Ensure trust score doesn't go below 0
    trustScore = Math.max(0, trustScore);

    // Determine recommended action
    let recommendedAction: FraudCheckResult['recommendedAction'] = 'none';
    if (trustScore < 40) {
      recommendedAction = 'suspend';
    } else if (trustScore < 70) {
      recommendedAction = 'verify';
    }

    // Update user's trust score in database
    const updateData: Record<string, Json> = { trustScore };
    if (flags.length > 0) {
      updateData.lastFlaggedAt = new Date().toISOString();
    }

    await supabase
      .from('User')
      .update(updateData)
      .eq('id', userId);

    // Create fraud flags in database
    for (const flag of flags) {
      await supabase
        .from('FraudFlag')
        .insert({
          userId,
          flagType: flag.type,
          severity: flag.severity,
          reason: flag.reason,
          metadata: flag.metadata ? JSON.stringify(flag.metadata) : null,
          riskScore: flag.severity,
          status: 'PENDING',
        });
    }

    return {
      isFlagged: flags.length > 0,
      flags,
      trustScore,
      recommendedAction,
    };
  } catch (error) {
    return {
      isFlagged: false,
      flags: [],
      trustScore: 100,
      recommendedAction: 'none',
    };
  }
}

export async function suspendUserForFraud(
  userId: string,
  fraudResult: FraudCheckResult
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from('User')
      .select(`
        email,
        profile:Profile(
          firstName,
          lastName
        )
      `)
      .eq('id', userId)
      .single();

    if (error || !user) return false;

    // Suspend user
    await supabase
      .from('User')
      .update({
        isSoftSuspended: true,
        fraudFlags: JSON.stringify(fraudResult.flags),
      })
      .eq('id', userId);

    // Extract flag reasons
    const flagReasons = fraudResult.flags.map(f => f.reason);

    // Send email notification to user
    try {
      await emailTemplates.sendAccountSuspendedEmail(
        user.email,
        fraudResult.trustScore,
        flagReasons
      );
    } catch (emailError) {
      // Email sending failed silently
    }

    return true;
  } catch (error) {
    return false;
  }
}

export async function notifyUserOfFraudDetection(
  userId: string,
  fraudResult: FraudCheckResult
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from('User')
      .select(`
        email,
        profile:Profile(
          firstName
        )
      `)
      .eq('id', userId)
      .single();

    if (!error && user) {
      const profile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
      const flagReasons = fraudResult.flags.map(f => f.reason);
      try {
        await emailTemplates.sendFraudDetectedEmail(
          user.email,
          fraudResult.trustScore,
          flagReasons,
          profile?.firstName || undefined
        );
      } catch (emailError) {
        // Email sending failed silently
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Automatically suspend user if fraud detection recommends it
 */
export async function autoSuspendIfNeeded(
  userId: string,
  fraudResult: FraudCheckResult
): Promise<boolean> {
  if (fraudResult.recommendedAction === 'suspend') {
    return await suspendUserForFraud(userId, fraudResult);
  }
  return false;
}
