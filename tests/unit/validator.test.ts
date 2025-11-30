import { describe, it, expect } from 'vitest';
import { validatePdfBytes } from '../../src/lib/core/validation/validator';
import { isPdfFile } from '../../src/lib/core/validation/validator';

describe('validator', () => {
  describe('isPdfFile', () => {
    it('should detect PDF files', () => {
      const pdfBytes = new TextEncoder().encode('%PDF-1.7\n');
      expect(isPdfFile(pdfBytes)).toBe(true);
    });

    it('should reject non-PDF files', () => {
      const textBytes = new TextEncoder().encode('Hello, World!');
      expect(isPdfFile(textBytes)).toBe(false);
    });

    it('should handle empty files', () => {
      expect(isPdfFile(new Uint8Array([]))).toBe(false);
    });
  });

  describe('validatePdfBytes', () => {
    it('should handle unsigned PDFs', async () => {
      const pdfBytes = new TextEncoder().encode('%PDF-1.7\n%%EOF');
      const result = await validatePdfBytes(pdfBytes);

      expect(result.signatureCount).toBe(0);
      expect(result.overallStatus).toBe('INDETERMINATE');
      expect(result.error).toContain('No signatures found');
    });

    it('should extract metadata', async () => {
      const pdfContent = `%PDF-1.7
/Info << /Title (Test Document) /Author (John Doe) >>
%%EOF`;
      const pdfBytes = new TextEncoder().encode(pdfContent);
      const result = await validatePdfBytes(pdfBytes);

      expect(result.metadata.version).toBe('1.7');
      expect(result.metadata.title).toBe('Test Document');
      expect(result.metadata.author).toBe('John Doe');
    });
  });
});
