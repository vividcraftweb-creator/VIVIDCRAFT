export function isArtistProfile(p: any): boolean {
  if (!p) return false;
  const email = String(p.email || p.business_email || '').toLowerCase().trim();
  const role = String(p.role || p.user_type || p.account_type || '').toLowerCase().trim();
  const fName = String(p.first_name || p.firstName || '').toLowerCase().trim();
  const lName = String(p.last_name || p.lastName || '').toLowerCase().trim();

  // 1. Explicitly exclude known client accounts
  if (email.includes('futureminds') || fName.includes('futureminds') || lName.includes('futureminds')) {
    return false;
  }

  // 2. studio1.foreignbusiness is strictly an Artist account
  if (email.includes('studio1') || fName.includes('studio1') || email.includes('studio') || fName.startsWith('studio')) {
    return true;
  }

  // 3. General role check (exclude client, buyer, admin, employer)
  if (role === 'client' || role === 'buyer' || role === 'admin' || role === 'employer') {
    return false;
  }

  return true;
}

