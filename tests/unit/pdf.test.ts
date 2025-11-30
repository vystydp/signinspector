import { describe, it, expect } from 'vitest';
import { PdfParser } from '../../src/lib/core/pdf/parser';

describe('PdfParser', () => {
  it('should parse PDF version', () => {
    const pdfContent = '%PDF-1.7\n%Comments\n';
    const bytes = new TextEncoder().encode(pdfContent);
    const parser = new PdfParser(bytes);
    const metadata = parser.extractMetadata();

    expect(metadata.version).toBe('1.7');
  });

  it('should handle empty PDF', () => {
    const bytes = new Uint8Array([]);
    const parser = new PdfParser(bytes);
    const signatures = parser.extractSignatures();

    expect(signatures).toEqual([]);
  });

  it('should extract ByteRange from signature dictionary', () => {
    const pdfContent = `
      /Type /Sig
      /ByteRange [0 1000 2000 3000]
      /Contents <48656c6c6f>
    `;
    const bytes = new TextEncoder().encode(pdfContent);
    const parser = new PdfParser(bytes);
    const signatures = parser.extractSignatures();

    expect(signatures.length).toBeGreaterThan(0);
    if (signatures.length > 0) {
      expect(signatures[0].byteRange).toEqual([0, 1000, 2000, 3000]);
    }
  });
});
