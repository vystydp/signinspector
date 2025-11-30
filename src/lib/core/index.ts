/**
 * Core validation logic - framework-agnostic exports
 */

// Types
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
} from './types';

export type { ExtractedSignature, DocumentMetadata } from './pdf/types';

// PDF parsing
export { PdfParser } from './pdf/parser';

// CMS validation
export { validateCmsSignature, extractSignerInfo } from './cms/cms-pkijs';

// Trust evaluation
export { lookupTrust, isTrustListLoaded, loadEUTrustList } from './trust/trust';
export type { EUTrustProvider, EUTrustList, TrustLookupResult } from './trust/trust';

// Integrity analysis
export { analyzeIntegrity, coversWholeDocument, analyzeRevisions } from './integrity/integrity';
export type { IntegrityResult } from './integrity/integrity';

// Validation orchestration
export { validatePdfBytes, validatePdfFile } from './validation/validator';
