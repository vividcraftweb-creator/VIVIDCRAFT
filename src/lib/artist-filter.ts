export function isArtistProfile(p: any): boolean {
  if (!p) return false;
  const email = String(p.email || p.business_email || p.businessEmail || '').toLowerCase().trim();
  const role = String(p.role || p.user_type || p.account_type || '').toLowerCase().trim();
  const fName = String(p.first_name || p.firstName || '').toLowerCase().trim();
  const lName = String(p.last_name || p.lastName || '').toLowerCase().trim();

  // 1. Strictly exclude users who have role = 'client' or known client/admin accounts
  if (
    role === 'client' ||
    role.includes('client') ||
    role === 'buyer' ||
    role === 'admin' ||
    role === 'employer' ||
    email.includes('futureminds') ||
    fName.includes('futureminds') ||
    lName.includes('futureminds')
  ) {
    return false;
  }

  // 2. Strictly match users where role = 'artist' (case-insensitive e.g. 'artist', 'Artist', 'ARTIST')
  if (role === 'artist' || role.startsWith('artist')) {
    return true;
  }

  // 3. Known studio demo artist accounts (if not marked as client)
  if (email.includes('studio1') || email.includes('studio') || fName.startsWith('studio')) {
    return true;
  }

  // Strictly do NOT show any profile that does not have role = 'artist'
  return false;
}

