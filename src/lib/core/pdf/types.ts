/**
 * Low-level PDF types for parsing and signature extraction
 */

/**
 * Extracted signature from PDF
 */
export interface ExtractedSignature {
  /** Byte range that is signed */
  byteRange: number[];
  /** PKCS#7/CMS signature data (hex encoded) */
  contents: string;
  /** Field name */
  name?: string;
  /** Reason for signing */
  reason?: string;
  /** Location */
  location?: string;
  /** Signing time (from signature dictionary, may be untrusted) */
  signTime?: Date;
}

/**
 * PDF document metadata
 */
export interface DocumentMetadata {
  /** PDF version */
  version?: string;
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
  /** Creation date */
  creationDate?: Date;
  /** Modification date */
  modificationDate?: Date;
  /** Number of pages */
  pageCount?: number;
}
