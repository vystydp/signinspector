/**
 * UI-specific types for SignInspector
 * Core validation types are in ./core/types.ts
 */

import type { SignatureInfo as CoreSignatureInfo } from './core/types';

// Re-export core types for convenience
export type {
  ValidationStatus,
  ValidationResult,
  SignatureInfo,
  CertificateInfo,
  AlgorithmInfo,
  PolicyWarning,
  ByteIntegrityStatus,
  RevisionChangeType,
  IntegrityStatus,
  TrustStatus,
} from './core/types';

export type { DocumentMetadata } from './core/pdf/types';

/**
 * Options for SignInspectorViewer
 */
export interface ISignInspectorViewerOptions {
  /** Width of the viewer (default: '100%') */
  width?: string | number;
  /** Height of the viewer (default: '600px') */
  height?: string | number;
  /** Theme (default: 'light') */
  theme?: 'light' | 'dark';
  /** Automatically resize to fit container (default: true) */
  autoResize?: boolean;
  /** Display watermark banner (default: true) */
  watermark?: boolean;
  /** Show detailed certificate information (default: false) */
  showDetailedCertInfo?: boolean;
  /** Show raw JSON view (default: false) */
  showRawJson?: boolean;
}

/**
 * Extracted signature from PDF
 * @internal
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
 * Event fired when a signature is selected
 */
export interface IEventSignatureSelected {
  /** Index of the selected signature */
  index: number;
  /** Signature information */
  signature: CoreSignatureInfo;
}

/**
 * Event types for SignInspector
 */
export type SignInspectorEvent = 'signatureSelected' | 'documentLoaded' | 'validationComplete';
