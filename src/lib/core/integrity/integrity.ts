/**
 * Document integrity analysis
 * Combines ByteRange verification with revision change detection
 */

import type { ByteIntegrityStatus, RevisionChangeType } from '../types';

/**
 * Integrity analysis result
 */
export interface IntegrityResult {
  /** Byte-level cryptographic integrity (from CMS verification) */
  bytes: ByteIntegrityStatus;
  /** Classification of changes in later revisions */
  revisionChange: RevisionChangeType;
  /** User-facing explanation message */
  message: string;
  /** Technical details for advanced users */
  details?: string;
}

/**
 * Check if ByteRange covers the whole document
 * @param pdfBytes - PDF file bytes
 * @param byteRange - ByteRange array from signature
 * @returns true if signature covers entire document
 */
export function coversWholeDocument(pdfBytes: Uint8Array, byteRange: number[]): boolean {
  const [a, b, c, d] = byteRange;
  const signedLength = b + d;
  const fileLength = pdfBytes.length;

  // Allow some tolerance for EOF marker and whitespace (typically 7-10 bytes)
  // This is common in valid PDFs due to %%EOF and trailing newlines
  const tolerance = 20;

  return Math.abs(fileLength - signedLength) <= tolerance;
}

/**
 * Analyze revisions after signature
 * @param pdfBytes - PDF file bytes
 * @param byteRange - ByteRange array from signature
 * @returns Revision change classification
 */
export function analyzeRevisions(pdfBytes: Uint8Array, byteRange: number[]): RevisionChangeType {
  const [a, b, c, d] = byteRange;
  const signatureEnd = c + d;
  const fileLength = pdfBytes.length;

  // Check if there's content after the signature
  if (signatureEnd >= fileLength - 20) {
    return 'NONE';
  }

  // Extract the incremental update section
  const updateSection = pdfBytes.slice(signatureEnd);
  const updateText = new TextDecoder('latin1').decode(updateSection);

  // Look for xref table or stream updates
  const hasXref = /\bxref\b/.test(updateText);
  const hasStream = /\bstream\b/.test(updateText);
  const hasContent = /\b(Page|Font|Image|XObject)\b/.test(updateText);

  if (hasContent) {
    return 'CONTENT';
  } else if (hasXref || hasStream) {
    return 'MINOR';
  } else if (updateText.trim().length > 50) {
    return 'UNKNOWN';
  }

  return 'NONE';
}

/**
 * Create integrity result from CMS verification and revision analysis
 * @param cmsVerified - Whether CMS signature verification succeeded
 * @param pdfBytes - PDF file bytes
 * @param byteRange - ByteRange array from signature
 * @returns Complete integrity analysis
 */
export function analyzeIntegrity(
  cmsVerified: boolean,
  pdfBytes: Uint8Array,
  byteRange: number[]
): IntegrityResult {
  const byteStatus: ByteIntegrityStatus = cmsVerified ? 'INTACT' : 'CHANGED';
  const revisionChange = analyzeRevisions(pdfBytes, byteRange);

  let message = '';
  let details = '';

  if (byteStatus === 'INTACT' && revisionChange === 'NONE') {
    message = 'Document has not been modified since signing';
    details = 'ByteRange hash verification passed. No incremental updates detected.';
  } else if (byteStatus === 'INTACT' && revisionChange === 'MINOR') {
    message = 'Document integrity preserved (minor metadata updates detected)';
    details = 'ByteRange hash verification passed. Incremental updates contain only non-content changes (e.g., form data, annotations).';
  } else if (byteStatus === 'INTACT' && revisionChange === 'CONTENT') {
    message = 'Document integrity preserved but content was added after signing';
    details = 'ByteRange hash verification passed. However, content changes were detected in incremental updates.';
  } else if (byteStatus === 'CHANGED') {
    message = 'Document has been modified since signing';
    details = 'ByteRange hash verification failed. The signed portions of the document have been altered.';
  } else {
    message = 'Unable to verify document integrity';
    details = 'Integrity check could not be completed.';
  }

  return {
    bytes: byteStatus,
    revisionChange,
    message,
    details
  };
}
