/**
 * Deterministic Chat Code generator and search matcher.
 * Formats: CHAT-XXXXXX (e.g., CHAT-8A3F12)
 *
 * Symmetrical: getChatCode(userA, userB) === getChatCode(userB, userA)
 */

export function getChatCode(userId1?: string | null, userId2?: string | null): string {
  if (!userId1 || !userId2) return 'CHAT-NONE';

  // Symmetrically sort user IDs so sender and receiver always get the exact same chat code
  const sorted = [String(userId1).trim().toLowerCase(), String(userId2).trim().toLowerCase()].sort();
  const combined = sorted.join('::');

  // djb2 hash algorithm
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to 6-character uppercase hex string
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(-6);
  return `CHAT-${hex}`;
}

/**
 * Normalize chat code input from search bar
 */
export function normalizeChatCode(query?: string | null): string {
  if (!query) return '';
  const trimmed = query.trim().toUpperCase().replace(/^[#\s]+/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('CHAT-')) return trimmed;
  if (trimmed.startsWith('CHAT')) return `CHAT-${trimmed.slice(4).replace(/^[-_]/, '')}`;
  // If user entered only the 6-character hex code
  if (/^[0-9A-F]{4,8}$/i.test(trimmed)) {
    return `CHAT-${trimmed}`;
  }
  return trimmed;
}

/**
 * Check if a search term matches a conversation's chat code
 */
export function matchesChatCode(code: string, query: string): boolean {
  if (!query) return true;
  const cleanCode = code.toUpperCase();
  const cleanQuery = query.trim().toUpperCase();
  const rawCodeHex = cleanCode.replace(/^CHAT-/, '');
  const rawQueryHex = cleanQuery.replace(/^CHAT-/, '');

  return (
    cleanCode.includes(cleanQuery) ||
    rawCodeHex.includes(rawQueryHex) ||
    cleanCode === cleanQuery
  );
}
