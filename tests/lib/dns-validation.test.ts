import { describe, it, expect } from 'vitest';
import { isValidIPv4, isValidIPv6 } from '@/lib/utils/dns-validation';

describe('DNS Validation - IPv4', () => {
  describe('isValidIPv4', () => {
    it('should accept valid IPv4 addresses', () => {
      expect(isValidIPv4('192.0.2.1')).toBe(true);
      expect(isValidIPv4('0.0.0.0')).toBe(true);
      expect(isValidIPv4('255.255.255.255')).toBe(true);
      expect(isValidIPv4('10.0.0.1')).toBe(true);
      expect(isValidIPv4('172.16.0.1')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(isValidIPv4('256.0.0.1')).toBe(false);
      expect(isValidIPv4('192.0.2')).toBe(false);
      expect(isValidIPv4('192.0.2.1.1')).toBe(false);
      expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false);
      expect(isValidIPv4('192.0.2.-1')).toBe(false);
    });
  });
});

describe('DNS Validation - IPv6', () => {
  describe('isValidIPv6', () => {
    describe('Valid IPv6 addresses', () => {
      it('should accept full form IPv6', () => {
        expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      });

      it('should accept compressed IPv6 with ::', () => {
        expect(isValidIPv6('2001:db8::1')).toBe(true);
        expect(isValidIPv6('2001:db8:85a3::8a2e:370:7334')).toBe(true);
        expect(isValidIPv6('2001:db8:85a3:0:0:8a2e:370:7334')).toBe(true);
      });

      it('should accept loopback address', () => {
        expect(isValidIPv6('::1')).toBe(true);
      });

      it('should accept all zeros', () => {
        expect(isValidIPv6('::')).toBe(true);
      });

      it('should accept IPv4-embedded IPv6', () => {
        expect(isValidIPv6('2001:db8::192.0.2.1')).toBe(true);
        expect(isValidIPv6('::192.0.2.1')).toBe(true);
      });

      it('should accept IPv4-mapped IPv6', () => {
        expect(isValidIPv6('::ffff:192.0.2.1')).toBe(true);
      });

      it('should accept uppercase hex digits', () => {
        expect(isValidIPv6('2001:DB8::1')).toBe(true);
        expect(isValidIPv6('2001:0DB8:85A3:0000:0000:8A2E:0370:7334')).toBe(true);
      });

      it('should accept mixed case hex digits', () => {
        expect(isValidIPv6('2001:Db8::1')).toBe(true);
      });

      it('should accept suppressed leading zeros', () => {
        expect(isValidIPv6('2001:db8:0:0:0:0:0:1')).toBe(true);
        expect(isValidIPv6('2001:db8:0:0:1:0:0:1')).toBe(true);
      });

      it('should trim and accept addresses with whitespace', () => {
        expect(isValidIPv6(' 2001:db8::1 ')).toBe(true);
        expect(isValidIPv6('  ::1  ')).toBe(true);
      });
    });

    describe('Invalid IPv6 addresses', () => {
      it('should reject IPv4-only addresses', () => {
        expect(isValidIPv6('192.0.2.1')).toBe(false);
        expect(isValidIPv6('10.0.0.1')).toBe(false);
      });

      it('should reject hostnames', () => {
        expect(isValidIPv6('example.com')).toBe(false);
        expect(isValidIPv6('mail.example.com')).toBe(false);
        expect(isValidIPv6('mail.example.com.')).toBe(false);
      });

      it('should reject invalid hextets', () => {
        expect(isValidIPv6('2001:db8::zzzz')).toBe(false);
        expect(isValidIPv6('2001:gggg::1')).toBe(false);
        expect(isValidIPv6('2001:db8::xyz')).toBe(false);
      });

      it('should reject multiple :: groups', () => {
        expect(isValidIPv6('2001:db8::1::1')).toBe(false);
        expect(isValidIPv6('2001::db8::1')).toBe(false);
      });

      it('should reject triple colon', () => {
        expect(isValidIPv6('2001:db8:::1')).toBe(false);
      });

      it('should reject more than 8 groups', () => {
        expect(isValidIPv6('2001:db8:1:2:3:4:5:6:7')).toBe(false);
        expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334:1234')).toBe(false);
      });

      it('should reject addresses with trailing junk', () => {
        expect(isValidIPv6('2001:db8::1x')).toBe(false);
        expect(isValidIPv6('2001:db8::1 extra')).toBe(false);
      });

      it('should reject addresses with leading junk', () => {
        expect(isValidIPv6('x2001:db8::1')).toBe(false);
        expect(isValidIPv6('extra 2001:db8::1')).toBe(false);
      });

      it('should reject empty string', () => {
        expect(isValidIPv6('')).toBe(false);
      });

      it('should reject single colon', () => {
        expect(isValidIPv6(':')).toBe(false);
      });

      it('should reject hextet exceeding 4 hex digits', () => {
        expect(isValidIPv6('2001:db8:12345::1')).toBe(false);
      });

      it('should reject malformed compressed notation', () => {
        expect(isValidIPv6('2001:db8:')).toBe(false);
        expect(isValidIPv6('::2001:db8:')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should accept link-local addresses', () => {
        expect(isValidIPv6('fe80::1')).toBe(true);
        expect(isValidIPv6('fe80::200:5aee:feaa:20a2')).toBe(true);
      });

      it('should accept multicast addresses', () => {
        expect(isValidIPv6('ff02::1')).toBe(true);
        expect(isValidIPv6('ff02::2')).toBe(true);
      });

      it('should accept unique local addresses', () => {
        expect(isValidIPv6('fc00::1')).toBe(true);
        expect(isValidIPv6('fd00::1')).toBe(true);
      });

      it('should accept documentation addresses', () => {
        expect(isValidIPv6('2001:db8::')).toBe(true);
        expect(isValidIPv6('2001:db8:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
      });
    });
  });
});

