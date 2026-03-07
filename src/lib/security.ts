import crypto from 'crypto';

// Secret key for encoding/decoding - in production this should be in env vars
const SECRET_KEY = process.env.ID_SECRET_KEY || 'your-secret-key-here';

export class SecureId {
  private static salt = SECRET_KEY;

  /**
   * Encode a database ID to a secure slug
   */
  static encode(id: string): string {
    try {
      // Create a hash of the ID with salt
      const hash = crypto.createHmac('sha256', this.salt).update(id).digest('hex');

      // Combine the original ID with the hash and encode to base64
      const combined = `${id}:${hash}`;
      const encoded = Buffer.from(combined).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      return encoded;
    } catch (error) {
      return id; // Fallback to original ID if encoding fails
    }
  }

  /**
   * Decode a secure slug back to the original database ID
   */
  static decode(slug: string): string {
    try {
      // Convert back from URL-safe base64 and decode
      const base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const decoded = Buffer.from(padded, 'base64').toString();
      const [id, hash] = decoded.split(':');

      if (!id || !hash) {
        throw new Error('Invalid slug format');
      }

      // Verify the hash
      const expectedHash = crypto.createHmac('sha256', this.salt).update(id).digest('hex');

      if (hash !== expectedHash) {
        throw new Error('Invalid slug - tampered data');
      }

      return id;
    } catch (error) {
      return slug; // Fallback to original slug if decoding fails
    }
  }

  /**
   * Check if a string looks like a secure slug vs raw ID
   */
  static isSecureSlug(value: string): boolean {
    try {
      // Raw IDs are typically cuid format (starts with 'c' and specific length)
      if (value.startsWith('c') && value.length >= 20) {
        return false;
      }
      
      // Check if it looks like base64 encoding (contains only base64url characters)
      if (!/^[A-Za-z0-9_-]+$/.test(value)) {
        return false;
      }
      
      // For development, be more lenient - just check basic structure
      if (process.env.NODE_ENV === 'development') {
        // Don't try to decode in development, just assume anything not looking like a cuid is a slug
        return value.length > 10 && !value.startsWith('c');
      }
      
      // Try to decode - if it works, it's likely a secure slug
      this.decode(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert raw ID to slug if needed
   */
  static ensureSlug(value: string): string {
    if (this.isSecureSlug(value)) {
      return value;
    }
    return this.encode(value);
  }

  /**
   * Convert slug to raw ID if needed
   */
  static ensureId(value: string): string {
    if (this.isSecureSlug(value)) {
      try {
        return this.decode(value);
      } catch (error) {
        // In development, fall back to using the value as-is if decode fails
        if (process.env.NODE_ENV === 'development') {
          return value;
        }
        throw error;
      }
    }
    return value;
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string {
    const sanitized = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  }

  /**
   * Validate numeric input
   */
  static sanitizeNumber(input: unknown, min?: number, max?: number): number {
    const num = typeof input === 'string' ? parseFloat(input) : Number(input);
    
    if (isNaN(num)) {
      throw new Error('Invalid number format');
    }
    
    if (min !== undefined && num < min) {
      throw new Error(`Number must be at least ${min}`);
    }
    
    if (max !== undefined && num > max) {
      throw new Error(`Number must be at most ${max}`);
    }
    
    return num;
  }

  /**
   * Sanitize SQL-like strings to prevent injection
   */
  static sanitizeSearch(input: string): string {
    return input
      .trim()
      .replace(/['"`;\\]/g, '') // Remove SQL injection chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .slice(0, 100); // Limit length
  }
}

/**
 * Rate limiting utilities (simple in-memory implementation)
 */
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  
  /**
   * Check if request is within rate limit
   */
  static checkLimit(
    identifier: string, 
    maxRequests: number = 100, 
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const requestData = this.requests.get(identifier);
    
    if (!requestData || now > requestData.resetTime) {
      // Reset or initialize
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }
    
    if (requestData.count >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    requestData.count++;
    return true;
  }
  
  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Clean up rate limiter every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => RateLimiter.cleanup(), 5 * 60 * 1000);
}