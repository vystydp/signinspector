/**
 * SignInspector - PDF Signature Viewer and Validator
 * Main library entry point
 */

// UI Components
export { SignInspectorViewer } from './ui/viewer';

// Core validation API
export { validatePdfBytes, validatePdfFile } from './core/validation/validator';

// UI mapping helpers
export { getStatusText, getStatusColor, getIntegrityColor, getTrustColor } from './core/validation/mapping';

// Core types
export type {
  ValidationStatus,
  ValidationResult,
  SignatureInfo,
  CertificateInfo,
  AlgorithmInfo,
  PolicyWarning,
  ByteIntegrityStatus,
  RevisionChangeType,
  TrustStatus,
} from './core/types';

export type { DocumentMetadata } from './core/pdf/types';

// UI types
export type {
  ISignInspectorViewerOptions,
  IEventSignatureSelected,
  SignInspectorEvent,
} from './types';

// Utilities
export { hexToBytes, bytesToHex, sha256 } from './std';
export { EventEmitter } from './events';

// Version
export const VERSION = '0.1.0';
