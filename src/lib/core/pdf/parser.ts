/**
 * PDF parsing and signature extraction
 * Browser-compatible implementation for extracting signature data from PDF files
 */

import type { ExtractedSignature, DocumentMetadata } from './types';

/**
 * Simple PDF parser for extracting signature information
 */
export class PdfParser {
  private data: Uint8Array;
  private textDecoder = new TextDecoder('latin1');

  constructor(pdfBytes: Uint8Array) {
    this.data = pdfBytes;
  }

  /**
   * Validate ByteRange array for security
   * Defends against known PDF signature attacks using malformed ranges
   */
  private validateByteRange(byteRange: number[]): { valid: boolean; error?: string } {
    const [a, b, c, d] = byteRange;
    const fileLength = this.data.length;

    // All values must be non-negative integers
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      return { valid: false, error: 'ByteRange contains negative values' };
    }

    // Check if ranges are within file bounds
    if (a + b > fileLength) {
      return { valid: false, error: 'First ByteRange segment exceeds file length' };
    }

    if (c + d > fileLength) {
      return { valid: false, error: 'Second ByteRange segment exceeds file length' };
    }

    // Ranges must not overlap and must be properly ordered
    if (a + b > c) {
      return { valid: false, error: 'ByteRange segments overlap or are out of order' };
    }

    // First segment should start at 0 (standard PDF signature)
    if (a !== 0) {
      return { valid: false, error: 'ByteRange does not start at file beginning (non-standard)' };
    }

    return { valid: true };
  }

  /**
   * Extract all signatures from the PDF
   */
  extractSignatures(): ExtractedSignature[] {
    const signatures: ExtractedSignature[] = [];
    const text = this.textDecoder.decode(this.data);

    // Try two methods: 1) AcroForm signature fields, 2) Direct ByteRange search

    // Method 1: Look for AcroForm signature fields (/FT /Sig)
    const acroFormSigs = this.extractAcroFormSignatures(text);
    signatures.push(...acroFormSigs);

    // Method 2: Find all ByteRange arrays (fallback for non-AcroForm signatures)
    const byteRangeRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
    let match;
    const foundRanges = new Set<string>();

    // Add ranges from AcroForm signatures to avoid duplicates
    for (const sig of acroFormSigs) {
      foundRanges.add(sig.byteRange.join(','));
    }

    while ((match = byteRangeRegex.exec(text)) !== null) {
      try {
        const byteRange = [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10),
          parseInt(match[4], 10),
        ];

        // Validate ByteRange for security
        const validation = this.validateByteRange(byteRange);
        if (!validation.valid) {
          console.error('Invalid ByteRange:', validation.error);
          continue;
        }

        // Create unique key to avoid duplicates
        const rangeKey = byteRange.join(',');
        if (foundRanges.has(rangeKey)) {
          continue;
        }
        foundRanges.add(rangeKey);

        // Look backwards from ByteRange to find the signature dictionary start
        const searchStart = Math.max(0, match.index - 3000);
        const contextBefore = text.substring(searchStart, match.index);

        // Find the last << before ByteRange (signature dictionary start)
        const dictStartMatch = contextBefore.lastIndexOf('<<');
        if (dictStartMatch === -1) {
          console.warn('Could not find signature dictionary start');
          continue;
        }

        const sigStart = searchStart + dictStartMatch;

        // Extract signature contents (must come after ByteRange)
        const contents = this.extractContents(text, match.index);
        if (!contents) {
          console.warn('Could not extract signature contents for ByteRange:', byteRange);
          continue;
        }

        // Extract optional fields from the signature dictionary
        const dictContext = text.substring(sigStart, match.index + 5000);
        const name = this.extractField(dictContext, 0, 'Name');
        const reason = this.extractField(dictContext, 0, 'Reason');
        const location = this.extractField(dictContext, 0, 'Location');
        const timeStr = this.extractField(dictContext, 0, 'M');

        const signature: ExtractedSignature = {
          byteRange,
          contents,
          name,
          reason,
          location,
          signTime: timeStr ? this.parsePdfDate(timeStr) : undefined,
        };

        signatures.push(signature);
      } catch (error) {
        console.error('Error extracting signature:', error);
      }
    }

    return signatures;
  }

  /**
   * Extract signatures from AcroForm fields
   */
  private extractAcroFormSignatures(text: string): ExtractedSignature[] {
    const signatures: ExtractedSignature[] = [];
    const foundRanges = new Set<string>();

    // Find AcroForm
    const acroFormMatch = text.match(/\/AcroForm\s*<<([^]*?)>>/);
    if (!acroFormMatch) {
      // No AcroForm found
      return signatures;
    }

    // AcroForm found

    // Find all /V references that point to signature dictionaries
    // Look for pattern: /V followed by object reference or inline dict
    const vRefRegex = /\/V\s+(\d+)\s+\d+\s+R/g;
    let vMatch;
    const processedObjects = new Set<string>();

    while ((vMatch = vRefRegex.exec(text)) !== null) {
      try {
        const objNum = vMatch[1];
        if (!objNum) {
          // If the capture group is undefined, skip this match
          continue;
        }

        // Skip if already processed
        if (processedObjects.has(objNum)) {
          continue;
        }
        processedObjects.add(objNum);

        // Find the object definition
        const objRegex = new RegExp(`${objNum}\\s+\\d+\\s+obj\\s*<<([^]*?)>>\\s*(?:stream|endobj)`, 's');
        const objMatch = text.match(objRegex);
        if (!objMatch) {
          continue;
        }

        const sigDict = objMatch[1];

        // Check if this is actually a signature (has ByteRange and Contents)
        const byteRangeMatch = sigDict?.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
        if (!byteRangeMatch) {
          continue;
        }

        const byteRange = [
          parseInt(byteRangeMatch[1]!, 10),
          parseInt(byteRangeMatch[2]!, 10),
          parseInt(byteRangeMatch[3]!, 10),
          parseInt(byteRangeMatch[4]!, 10),
        ];

        // Validate ByteRange for security
        const validation = this.validateByteRange(byteRange);
        if (!validation.valid) {
          console.error('Invalid ByteRange in AcroForm signature:', validation.error);
          continue;
        }

        // Check for duplicates by ByteRange
        const rangeKey = byteRange.join(',');
        if (foundRanges.has(rangeKey)) {
          continue;
        }
        foundRanges.add(rangeKey);

        // Extracted ByteRange from AcroForm

        // Extract Contents
        const contentsMatch = sigDict.match(/\/Contents\s*<([0-9A-Fa-f\s\r\n]+)>/);
        if (!contentsMatch) {
          console.warn('No Contents in signature dictionary');
          continue;
        }

        const contents = contentsMatch[1].replace(/\s+/g, '');
        // Extracted signature contents

        // Find the field that references this signature object to get Name, etc.
        const fieldRefRegex = new RegExp(`/V\\s+${objNum}\\s+\\d+\\s+R[^]*?(?:<<|$)`, 's');
        const fieldMatch = text.match(fieldRefRegex);
        const fieldContext = fieldMatch ? fieldMatch[0] : '';

        // Extract metadata from field and signature dict
        const name = this.extractField(fieldContext + sigDict, 0, 'Name') ||
                     this.extractField(fieldContext + sigDict, 0, 'T');
        const reason = this.extractField(fieldContext + sigDict, 0, 'Reason');
        const location = this.extractField(fieldContext + sigDict, 0, 'Location');
        const contactInfo = this.extractField(fieldContext + sigDict, 0, 'ContactInfo');
        const timeStr = this.extractField(fieldContext + sigDict, 0, 'M');

        const signature: ExtractedSignature = {
          byteRange,
          contents,
          name: name || contactInfo,
          reason,
          location,
          signTime: timeStr ? this.parsePdfDate(timeStr) : undefined,
        };

        signatures.push(signature);
      } catch (error) {
        console.error('Error extracting AcroForm signature:', error);
      }
    }

    return signatures;
  }  /**
   * Extract Contents field (hex-encoded signature data)
   */
  private extractContents(text: string, startPos: number): string | null {
    // Look for /Contents <HEX_DATA> - may span multiple lines
    const searchText = text.substring(startPos, startPos + 30000);

    // Try to find Contents with angle brackets (most common)
    const contentsMatch = searchText.match(/\/Contents\s*<([0-9A-Fa-f\s\r\n]+)>/);
    if (contentsMatch) {
      // Remove all whitespace from hex string
      return contentsMatch[1].replace(/\s+/g, '');
    }

    return null;
  }

  /**
   * Extract a field from signature dictionary
   */
  private extractField(text: string, startPos: number, fieldName: string): string | undefined {
    // First try to find the field name
    const fieldPattern = new RegExp(`\\/${fieldName}\\s*\\(`);
    const searchText = text.substring(startPos, startPos + 5000);
    const fieldMatch = fieldPattern.exec(searchText);

    if (fieldMatch) {
      // Found the field, now extract the string content between balanced parentheses
      let pos = fieldMatch.index + fieldMatch[0].length;
      let depth = 1;
      let content = '';
      let escaped = false;

      while (pos < searchText.length && depth > 0) {
        const char = searchText[pos];

        if (escaped) {
          content += char;
          escaped = false;
        } else if (char === '\\') {
          content += char;
          escaped = true;
        } else if (char === '(') {
          depth++;
          content += char;
        } else if (char === ')') {
          depth--;
          if (depth > 0) {
            content += char;
          }
        } else {
          content += char;
        }

        pos++;
      }

      if (depth === 0) {
        return this.decodePdfString(content);
      }
    }

    // Try with angle brackets (hex string)
    const hexRegex = new RegExp(`\\/${fieldName}\\s*<([0-9A-Fa-f]+)>`);
    const hexMatch = searchText.match(hexRegex);

    if (hexMatch) {
      return this.hexToString(hexMatch[1]);
    }

    return undefined;
  }

  /**
   * Decode PDF string (handle escape sequences)
   */
  private decodePdfString(str: string): string {
    // Handle escape sequences first
    const decoded = str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');

    // Convert string to bytes (each character is one byte in the PDF)
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i) & 0xFF; // Get only the low byte
    }

    // Check for UTF-16BE BOM (0xFE 0xFF)
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      // UTF-16BE encoded string
      try {
        const decoder = new TextDecoder('utf-16be');
        return decoder.decode(bytes.slice(2)); // Skip BOM
      } catch (err) {
        console.warn('UTF-16BE decoding failed:', err);
        return decoded;
      }
    }

    // Check for UTF-8 BOM (0xEF 0xBB 0xBF)
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      try {
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes.slice(3)); // Skip BOM
      } catch (err) {
        console.warn('UTF-8 decoding failed:', err);
        return decoded;
      }
    }

    // Try UTF-8 decoding (most modern PDFs use UTF-8)
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const utf8Result = decoder.decode(bytes);
      // Check if the result looks reasonable (no replacement characters)
      if (!utf8Result.includes('\uFFFD')) {
        return utf8Result;
      }
    } catch {
      // UTF-8 decoding failed, continue to PDFDocEncoding
    }

    // Fall back to PDFDocEncoding (ISO Latin-1 with custom mappings for 128-255)
    // For now, use Latin-1 decoding which handles most cases
    try {
      const decoder = new TextDecoder('iso-8859-1');
      return decoder.decode(bytes);
    } catch (err) {
      console.warn('PDFDocEncoding fallback failed:', err);
      return decoded;
    }
  }

  /**
   * Convert hex string to UTF-8 string
   */
  private hexToString(hex: string): string {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * Parse PDF date format (D:YYYYMMDDHHmmSS+HH'mm' or D:YYYYMMDDHHmmSSZ)
   * Examples: D:20250425093932+02'00', D:20250425093932Z
   */
  private parsePdfDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;

    // Remove D: prefix if present
    dateStr = dateStr.replace(/^D:/, '').trim();

    // Extract basic date/time components (YYYYMMDDHHmmSS)
    if (dateStr.length < 14) return undefined;

    const year = parseInt(dateStr.substr(0, 4), 10);
    const month = parseInt(dateStr.substr(4, 2), 10) - 1; // 0-based
    const day = parseInt(dateStr.substr(6, 2), 10);
    const hour = parseInt(dateStr.substr(8, 2), 10) || 0;
    const minute = parseInt(dateStr.substr(10, 2), 10) || 0;
    const second = parseInt(dateStr.substr(12, 2), 10) || 0;

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return undefined;
    }

    // Parse timezone offset if present (format: +HH'mm' or -HH'mm' or Z)
    let offsetMinutes = 0;
    const remainder = dateStr.substr(14);

    if (remainder && remainder !== 'Z') {
      // Match ±HH'mm' format (e.g., +02'00')
      const tzMatch = remainder.match(/^([+-])(\d{2})'(\d{2})'?/);
      if (tzMatch) {
        const sign = tzMatch[1] === '+' ? 1 : -1;
        const tzHours = parseInt(tzMatch[2], 10);
        const tzMinutes = parseInt(tzMatch[3], 10);
        offsetMinutes = sign * (tzHours * 60 + tzMinutes);
      }
    }

    try {
      // Create date in local time
      const localDate = new Date(year, month, day, hour, minute, second);

      // Adjust for timezone offset (convert to UTC)
      // If the PDF says +02'00', it means the time is 2 hours ahead of UTC
      // So we subtract the offset to get UTC time
      const utcTime = localDate.getTime() - (offsetMinutes * 60 * 1000);

      return new Date(utcTime);
    } catch {
      return undefined;
    }
  }

  /**
   * Extract document metadata
   */
  extractMetadata(): DocumentMetadata {
    const text = this.textDecoder.decode(this.data);
    const metadata: DocumentMetadata = {};

    // Extract PDF version
    const versionMatch = text.match(/^%PDF-(\d+\.\d+)/);
    if (versionMatch) {
      metadata.version = versionMatch[1];
    }

    // Extract Info dictionary
    const infoMatch = text.match(/\/Info\s*<<([^>]+)>>/s);
    if (infoMatch) {
      const infoDict = infoMatch[1];

      // Extract title
      const titleMatch = infoDict.match(/\/Title\s*\(([^)]+)\)/);
      if (titleMatch) {
        metadata.title = this.decodePdfString(titleMatch[1]);
      }

      // Extract author
      const authorMatch = infoDict.match(/\/Author\s*\(([^)]+)\)/);
      if (authorMatch) {
        metadata.author = this.decodePdfString(authorMatch[1]);
      }

      // Extract creation date
      const creationMatch = infoDict.match(/\/CreationDate\s*\(([^)]+)\)/);
      if (creationMatch) {
        metadata.creationDate = this.parsePdfDate(creationMatch[1]);
      }

      // Extract modification date
      const modMatch = infoDict.match(/\/ModDate\s*\(([^)]+)\)/);
      if (modMatch) {
        metadata.modificationDate = this.parsePdfDate(modMatch[1]);
      }
    }

    // Count pages (approximate)
    const pagesMatch = text.match(/\/Type\s*\/Pages\s*\/Count\s*(\d+)/);
    if (pagesMatch) {
      metadata.pageCount = parseInt(pagesMatch[1], 10);
    }

    return metadata;
  }

  /**
   * Get signed data for a signature
   */
  getSignedData(byteRange: number[]): Uint8Array {
    if (byteRange.length !== 4) {
      throw new Error('Invalid ByteRange');
    }

    const [start1, length1, start2, length2] = byteRange;

    // Concatenate the two byte ranges
    const signedData = new Uint8Array(length1 + length2);
    signedData.set(this.data.slice(start1, start1 + length1), 0);
    signedData.set(this.data.slice(start2, start2 + length2), length1);

    return signedData;
  }

  /**
   * Check if document has been modified after signing
   */
  checkDocumentIntegrity(byteRange: number[]): boolean {
    if (byteRange.length !== 4) {
      return false;
    }

    const [start1, length1, start2, length2] = byteRange;

    // Check if ByteRange covers the entire document except the signature itself
    const totalCoveredBytes = length1 + length2;
    const expectedBytes = this.data.length - (start2 - start1 - length1);

    return Math.abs(totalCoveredBytes - expectedBytes) < 100; // Allow small tolerance
  }
}

/**
 * Extract signatures from PDF bytes
 */
export function extractSignatures(pdfBytes: Uint8Array): ExtractedSignature[] {
  const parser = new PdfParser(pdfBytes);
  return parser.extractSignatures();
}

/**
 * Extract metadata from PDF bytes
 */
export function extractMetadata(pdfBytes: Uint8Array): DocumentMetadata {
  const parser = new PdfParser(pdfBytes);
  return parser.extractMetadata();
}

/**
 * Get signed data for verification
 */
export function getSignedData(pdfBytes: Uint8Array, byteRange: number[]): Uint8Array {
  const parser = new PdfParser(pdfBytes);
  return parser.getSignedData(byteRange);
}

/**
 * Check document integrity
 */
export function checkIntegrity(pdfBytes: Uint8Array, byteRange: number[]): boolean {
  const parser = new PdfParser(pdfBytes);
  return parser.checkDocumentIntegrity(byteRange);
}
