import { ethers } from 'ethers';

// Security configuration
const SECURITY_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
  BLOCKED_ADDRESSES: new Set([
    '0x0000000000000000000000000000000000000000', // Null address
    '0x000000000000000000000000000000000000dead', // Burn address
  ]),
  SUSPICIOUS_PATTERNS: [
    /script/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload/i,
    /onerror/i,
  ],
  MAX_ADDRESS_LENGTH: 42,
  MIN_ADDRESS_LENGTH: 42,
};

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class SecurityService {
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private requestLog: { timestamp: number; ip: string; endpoint: string }[] = [];

  // Input validation methods
  validateEthereumAddress(address: string): { isValid: boolean; error?: string } {
    if (!address) {
      return { isValid: false, error: 'Address is required' };
    }

    if (typeof address !== 'string') {
      return { isValid: false, error: 'Address must be a string' };
    }

    if (address.length !== SECURITY_CONFIG.MAX_ADDRESS_LENGTH) {
      return { isValid: false, error: 'Invalid address length' };
    }

    if (!address.startsWith('0x')) {
      return { isValid: false, error: 'Address must start with 0x' };
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return { isValid: false, error: 'Address contains invalid characters' };
    }

    if (SECURITY_CONFIG.BLOCKED_ADDRESSES.has(address.toLowerCase())) {
      return { isValid: false, error: 'Address is blocked' };
    }

    try {
      ethers.getAddress(address); // Validates checksum
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid address checksum' };
    }
  }

  validateNumericInput(value: unknown, min?: number, max?: number): { isValid: boolean; error?: string } {
    if (value === null || value === undefined) {
      return { isValid: false, error: 'Value is required' };
    }

    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return { isValid: false, error: 'Value must be a number' };
    }

    if (!isFinite(numValue)) {
      return { isValid: false, error: 'Value must be finite' };
    }

    if (min !== undefined && numValue < min) {
      return { isValid: false, error: `Value must be at least ${min}` };
    }

    if (max !== undefined && numValue > max) {
      return { isValid: false, error: `Value must be at most ${max}` };
    }

    return { isValid: true };
  }

  sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove potentially dangerous patterns
    let sanitized = input;
    SECURITY_CONFIG.SUSPICIOUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Encode HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return sanitized.trim();
  }

  // Rate limiting
  checkRateLimit(identifier: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const entry = this.rateLimitMap.get(identifier);

    if (!entry) {
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + 60000, // 1 minute
        blocked: false
      });
      return { allowed: true };
    }

    if (now > entry.resetTime) {
      // Reset the counter
      entry.count = 1;
      entry.resetTime = now + 60000;
      entry.blocked = false;
      return { allowed: true };
    }

    entry.count++;

    if (entry.count > SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      entry.blocked = true;
      return { allowed: false, resetTime: entry.resetTime };
    }

    return { allowed: true };
  }

  // Security headers and CSP
  getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https://eth.llamarpc.com https://api.etherscan.io",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
  }

  // Log security events
  logSecurityEvent(event: {
    type: 'rate_limit' | 'invalid_input' | 'suspicious_activity';
    details: string;
    identifier?: string;
    timestamp?: number;
  }): void {
    const logEntry = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };

    console.warn('Security Event:', logEntry);

    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToSecurityMonitoring(logEntry);
    }
  }

  private sendToSecurityMonitoring(event: Record<string, unknown>): void {
    // Integrate with security monitoring services like Datadog, Splunk, etc.
    // For now, just log to console in production
    console.error('Production Security Event:', event);
  }

  // Validate transaction data
  validateTransactionData(tx: Record<string, unknown>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!tx.hash || typeof tx.hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(tx.hash)) {
      errors.push('Invalid transaction hash');
    }

    const fromValidation = this.validateEthereumAddress(tx.from as string);
    if (!fromValidation.isValid) {
      errors.push(`Invalid from address: ${fromValidation.error}`);
    }

    const toValidation = this.validateEthereumAddress(tx.to as string);
    if (!toValidation.isValid) {
      errors.push(`Invalid to address: ${toValidation.error}`);
    }

    const amountValidation = this.validateNumericInput(tx.amount, 0);
    if (!amountValidation.isValid) {
      errors.push(`Invalid amount: ${amountValidation.error}`);
    }

    if (!tx.timestamp || !(tx.timestamp instanceof Date)) {
      errors.push('Invalid timestamp');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Clean up old rate limit entries
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime + 3600000) { // Remove entries older than 1 hour
        this.rateLimitMap.delete(key);
      }
    }
  }

  // Get security metrics
  getSecurityMetrics(): {
    activeRateLimits: number;
    blockedRequests: number;
    totalRequests: number;
  } {
    const now = Date.now();
    let blockedRequests = 0;
    let activeRateLimits = 0;

    for (const entry of this.rateLimitMap.values()) {
      if (now <= entry.resetTime) {
        activeRateLimits++;
        if (entry.blocked) {
          blockedRequests++;
        }
      }
    }

    return {
      activeRateLimits,
      blockedRequests,
      totalRequests: this.requestLog.length
    };
  }
}

export const securityService = new SecurityService();

// Cleanup interval
setInterval(() => {
  securityService.cleanupRateLimits();
}, 300000); // Every 5 minutes
