import { describe, it, expect } from 'vitest';
import { hexToBytes, bytesToHex, sha256 } from '../../src/lib/std';

describe('std utilities', () => {
  describe('hexToBytes', () => {
    it('should convert hex string to bytes', () => {
      const hex = '48656c6c6f';
      const bytes = hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle empty string', () => {
      const bytes = hexToBytes('');
      expect(bytes).toEqual(new Uint8Array([]));
    });
  });

  describe('bytesToHex', () => {
    it('should convert bytes to hex string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('48656c6c6f');
    });

    it('should handle empty array', () => {
      const hex = bytesToHex(new Uint8Array([]));
      expect(hex).toBe('');
    });
  });

  describe('sha256', () => {
    it('should compute SHA-256 hash', async () => {
      const data = new TextEncoder().encode('Hello, World!');
      const hash = await sha256(data);
      expect(hash.length).toBe(32);
      expect(bytesToHex(hash)).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
    });
  });
});
