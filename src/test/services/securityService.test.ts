import { describe, it, expect, beforeEach, vi } from 'vitest';
import { securityService } from '../../services/securityService';

describe('SecurityService', () => {
  beforeEach(() => {
    // Clear rate limits before each test
    securityService.cleanupRateLimits();
  });

  describe('validateEthereumAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df8';
      const result = securityService.validateEthereumAddress(validAddress);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid addresses', () => {
      const testCases = [
        { address: '', expectedError: 'Address is required' },
        { address: '0x123', expectedError: 'Invalid address length' },
        { address: '742d35Cc6634C0532925a3b8D4C9db96C4b4Df8', expectedError: 'Address must start with 0x' },
        { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4DfG', expectedError: 'Address contains invalid characters' },
        { address: '0x0000000000000000000000000000000000000000', expectedError: 'Address is blocked' },
      ];

      testCases.forEach(({ address, expectedError }) => {
        const result = securityService.validateEthereumAddress(address);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });

    it('should reject non-string inputs', () => {
      const result = securityService.validateEthereumAddress(123 as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Address must be a string');
    });
  });

  describe('validateNumericInput', () => {
    it('should validate correct numeric inputs', () => {
      const testCases = [
        { value: 42, min: 0, max: 100 },
        { value: '42', min: 0, max: 100 },
        { value: 0, min: 0 },
        { value: 100, max: 100 },
      ];

      testCases.forEach(({ value, min, max }) => {
        const result = securityService.validateNumericInput(value, min, max);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid numeric inputs', () => {
      const testCases = [
        { value: null, expectedError: 'Value is required' },
        { value: undefined, expectedError: 'Value is required' },
        { value: 'abc', expectedError: 'Value must be a number' },
        { value: Infinity, expectedError: 'Value must be finite' },
        { value: -Infinity, expectedError: 'Value must be finite' },
        { value: 5, min: 10, expectedError: 'Value must be at least 10' },
        { value: 15, max: 10, expectedError: 'Value must be at most 10' },
      ];

      testCases.forEach(({ value, min, max, expectedError }) => {
        const result = securityService.validateNumericInput(value, min, max);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize dangerous input patterns', () => {
      const testCases = [
        { input: '<script>alert("xss")</script>', expected: 'alert(&quot;xss&quot;)' },
        { input: 'javascript:alert(1)', expected: 'alert(1)' },
        { input: 'onload="malicious()"', expected: '=&quot;malicious()&quot;' },
        { input: 'Hello & World', expected: 'Hello &amp; World' },
        { input: '<div>content</div>', expected: '&lt;div&gt;content&lt;/div&gt;' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = securityService.sanitizeInput(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle non-string inputs', () => {
      const result = securityService.sanitizeInput(123 as unknown as string);
      expect(result).toBe('');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', () => {
      const identifier = 'test-user';
      
      for (let i = 0; i < 50; i++) {
        const result = securityService.checkRateLimit(identifier);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block requests exceeding rate limit', () => {
      const identifier = 'test-user-2';
      
      // Make requests up to the limit
      for (let i = 0; i < 60; i++) {
        securityService.checkRateLimit(identifier);
      }
      
      // Next request should be blocked
      const result = securityService.checkRateLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeDefined();
    });

    it('should reset rate limit after time window', () => {
      const identifier = 'test-user-3';
      
      // Mock time to simulate rate limit reset
      const originalNow = Date.now;
      let mockTime = Date.now();
      Date.now = vi.fn(() => mockTime);
      
      // Exceed rate limit
      for (let i = 0; i < 61; i++) {
        securityService.checkRateLimit(identifier);
      }
      
      // Should be blocked
      let result = securityService.checkRateLimit(identifier);
      expect(result.allowed).toBe(false);
      
      // Advance time by 1 minute
      mockTime += 60001;
      
      // Should be allowed again
      result = securityService.checkRateLimit(identifier);
      expect(result.allowed).toBe(true);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('validateTransactionData', () => {
    it('should validate correct transaction data', () => {
      const validTx = {
        hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Df8',
        to: '0x8ba1f109551bD432803012645Aac136c22C177ec8',
        amount: 100,
        timestamp: new Date(),
        fee: 0.001,
      };

      const result = securityService.validateTransactionData(validTx);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid transaction data', () => {
      const invalidTx = {
        hash: 'invalid-hash',
        from: 'invalid-address',
        to: 'invalid-address',
        amount: -100,
        timestamp: 'invalid-date',
        fee: 'invalid-fee',
      };

      const result = securityService.validateTransactionData(invalidTx);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getSecurityHeaders', () => {
    it('should return comprehensive security headers', () => {
      const headers = securityService.getSecurityHeaders();
      
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      securityService.logSecurityEvent({
        type: 'rate_limit',
        details: 'Rate limit exceeded',
        identifier: 'test-user',
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Security Event:',
        expect.objectContaining({
          type: 'rate_limit',
          details: 'Rate limit exceeded',
          identifier: 'test-user',
          timestamp: expect.any(Number),
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return security metrics', () => {
      // Generate some rate limit data
      securityService.checkRateLimit('user1');
      securityService.checkRateLimit('user2');
      
      const metrics = securityService.getSecurityMetrics();
      
      expect(metrics).toHaveProperty('activeRateLimits');
      expect(metrics).toHaveProperty('blockedRequests');
      expect(metrics).toHaveProperty('totalRequests');
      expect(typeof metrics.activeRateLimits).toBe('number');
      expect(typeof metrics.blockedRequests).toBe('number');
      expect(typeof metrics.totalRequests).toBe('number');
    });
  });
});
