/**
 * Core type definitions for validation results
 * These are framework-agnostic types used throughout the validator
 */

/**
 * Validation status of a PDF signature
 */
export type ValidationStatus = 'VALID' | 'INVALID' | 'INDETERMINATE';

/**
 * Byte-level cryptographic integrity status
 * Based purely on CMS verification of ByteRange hash
 */
export type ByteIntegrityStatus = 'INTACT' | 'CHANGED' | 'NOT_CHECKED';

/**
 * Classification of changes in later PDF revisions
 * Determined by analyzing incremental updates after the signature
 */
export type RevisionChangeType = 'NONE' | 'MINOR' | 'CONTENT' | 'UNKNOWN';

/**
 * Legacy status for backward compatibility
 * @deprecated Use ByteIntegrityStatus and RevisionChangeType instead
 */
export type IntegrityStatus = 'OK' | 'MODIFIED' | 'NOT_CHECKED';

/**
 * Trust evaluation status for algorithms and certificates
 */
export type TrustStatus = 'TRUSTED' | 'NOT_EVALUATED' | 'WEAK_ALGO' | 'UNSUPPORTED_ALGO';

/**
 * Discriminated union for byte integrity results
 * Provides type-safe handling of different integrity states
 */
export type ByteIntegrityResult =
  | { kind: 'intact'; verifiedAt: Date }
  | { kind: 'changed'; reason: string; details?: string }
  | { kind: 'not-checked'; reason: string };

/**
 * Discriminated union for revision change results
 * Provides type-safe handling of PDF revision changes
 */
export type RevisionChangeResult =
  | { kind: 'none'; message: string }
  | { kind: 'minor'; changes: string[]; message: string }
  | { kind: 'content'; changes: string[]; message: string; severity: 'warning' | 'error' }
  | { kind: 'unknown'; message: string };

/**
 * Discriminated union for trust evaluation results
 * Provides type-safe handling of trust states
 */
export type TrustResult =
  | { kind: 'trusted'; source: 'system' | 'eu-trust-list' | 'manual'; validatedAt: Date }
  | { kind: 'not-evaluated'; reason: string }
  | { kind: 'weak-algorithm'; algorithm: string; warnings: PolicyWarning[] }
  | { kind: 'unsupported-algorithm'; algorithm: string; oid?: string };

/**
 * Cryptographic algorithm information
 */
export interface AlgorithmInfo {
  /** Hash algorithm (e.g., "SHA-256", "SHA-1") */
  hashAlgorithm?: string;
  /** Signature algorithm (e.g., "RSASSA-PKCS1-v1_5", "ECDSA") */
  signatureAlgorithm?: string;
  /** Key type (e.g., "RSA", "EC") */
  keyType?: string;
  /** Key size in bits (e.g., 2048, 256) */
  keySizeBits?: number;
  /** Full algorithm OID */
  oid?: string;
}

/**
 * Security policy warning
 */
export interface PolicyWarning {
  /** Warning code (e.g., "WEAK_HASH", "SMALL_KEY") */
  code: string;
  /** Human-readable explanation */
  message: string;
  /** Reference URL to NIST/eIDAS guidance (optional) */
  referenceUrl?: string;
  /** Severity level */
  severity: 'warning' | 'error' | 'info';
}

/**
 * Certificate information extracted from a signature
 */
export interface CertificateInfo {
  /** Certificate subject (DN) */
  subject: string;
  /** Certificate issuer (DN) */
  issuer: string;
  /** Certificate serial number */
  serialNumber: string;
  /** Certificate validity period start */
  notBefore: Date;
  /** Certificate validity period end */
  notAfter: Date;
  /** Certificate fingerprint (SHA-256) */
  fingerprint: string;
  /** Key usage flags */
  keyUsage?: string[];
  /** Extended key usage OIDs */
  extendedKeyUsage?: string[];
  /** Internal promise for async fingerprint computation */
  _fingerprintPromise?: Promise<string>;
}

/**
 * Information about a single signature in a PDF
 */
export interface SignatureInfo {
  /** Signer's name from certificate */
  signerName: string;
  /** Signer's organization (if available) */
  organization?: string;
  /** Signer's country code (if available) */
  country?: string;
  /** Signature timestamp (undefined if not available in PDF/CMS) */
  signedAt?: Date;
  /** Validation status of this signature */
  status: ValidationStatus;
  /** Reason for signing (if provided) */
  reason?: string;
  /** Location of signing (if provided) */
  location?: string;
  /** Certificate information */
  certificate: CertificateInfo;
  /** Detailed error message if validation failed */
  error?: string;
  /** Whether the signature covers the entire document */
  coversWholeDocument: boolean;
  /** Whether this is a BankID signature */
  isBankId?: boolean;
  /** BankID Certificate Authority name */
  bankIdCaName?: string;
  /** Whether the certificate is from a trusted CA */
  isTrustedCA?: boolean;
  /** Name of the trusted CA */
  trustedCAName?: string;
  /** Cryptographic algorithm information */
  algorithms: AlgorithmInfo;
  /** Document integrity check result */
  integrity: {
    /** Byte-level cryptographic integrity (from CMS verification) */
    bytes: ByteIntegrityStatus;
    /** Classification of changes in later revisions */
    revisionChange: RevisionChangeType;
    /** User-facing explanation message */
    message: string;
    /** Technical details for advanced users */
    details?: string;
    /** @deprecated Legacy status field for backward compatibility */
    status?: IntegrityStatus;
  };
  /** Trust evaluation result */
  trust: {
    status: TrustStatus;
    policyWarnings: PolicyWarning[];
  };
  /** EU Trust List lookup result (if available) */
  euTrustList?: {
    found: boolean;
    providerName?: string;
    country?: string;
    serviceType?: string;
    status?: string;
    listVersion?: string;
    matchedBy?: 'ski' | 'dn';
  };
}

/**
 * Result of PDF signature validation
 */
export interface ValidationResult {
  /** Overall validation status */
  overallStatus: ValidationStatus;
  /** Whether the document has been modified after signing */
  documentModified: boolean;
  /** Number of signatures found */
  signatureCount: number;
  /** Detailed information about each signature */
  signatures: SignatureInfo[];
  /** Document metadata */
  metadata: import('./pdf/types').DocumentMetadata;
  /** Overall error message (if validation failed at document level) */
  error?: string;
}
