/**
 * PDF signature validator
 * Orchestrates PDF parsing and CMS validation
 */

import type { ValidationResult, SignatureInfo, ValidationStatus, IntegrityStatus, ByteIntegrityStatus, RevisionChangeType } from '../types';
import type { ExtractedSignature, DocumentMetadata } from '../pdf/types';
import { PdfParser, extractSignatures, extractMetadata, getSignedData, checkIntegrity } from '../pdf/parser';
import { validateCmsSignature, extractSignerInfo, extractSigningTime } from '../cms/cms-pkijs';
import { lookupTrust, isTrustListLoaded, loadEUTrustList } from '../trust/trust';
import { analyzeIntegrity, coversWholeDocument } from '../integrity/integrity';
import { t } from '../../i18n/i18n';

/**
 * Validate PDF signatures
 */
export async function validatePdfBytes(pdfBytes: Uint8Array): Promise<ValidationResult> {
  // Preload EU Trust List (wait for it to be ready)
  if (!isTrustListLoaded()) {
    try {
      await loadEUTrustList();
    } catch (err) {
      console.warn('Failed to load EU Trust List:', err);
    }
  }
  const result: ValidationResult = {
    overallStatus: 'INDETERMINATE',
    documentModified: false,
    signatureCount: 0,
    signatures: [],
    metadata: {},
  };

  try {
    // Extract metadata
    result.metadata = extractMetadata(pdfBytes);

    // Extract signatures
    const extractedSignatures = extractSignatures(pdfBytes);
    result.signatureCount = extractedSignatures.length;

    if (extractedSignatures.length === 0) {
      result.error = 'No signatures found in PDF';
      result.overallStatus = 'INDETERMINATE';
      return result;
    }

    // Validate each signature
    const signaturePromises = extractedSignatures.map(async (extracted) => {
      const signatureInfo: SignatureInfo = {
        signerName: 'Unknown',
        signedAt: extracted.signTime, // Will be undefined if PDF has no time - that's OK
        status: 'INDETERMINATE',
        reason: extracted.reason,
        location: extracted.location,
        certificate: {
          subject: 'Unknown',
          issuer: 'Unknown',
          serialNumber: '00',
          notBefore: new Date(),
          notAfter: new Date(),
          fingerprint: '',
        },
        coversWholeDocument: false,
        algorithms: {},
        integrity: {
          bytes: 'NOT_CHECKED' as ByteIntegrityStatus,
          revisionChange: 'UNKNOWN' as RevisionChangeType,
          message: t('integrity.notChecked'),
          status: 'NOT_CHECKED' as IntegrityStatus, // legacy field for backward compatibility
        },
        trust: {
          status: 'NOT_EVALUATED',
          policyWarnings: [],
        },
      };

      try {
        // Check if signature covers whole document
        signatureInfo.coversWholeDocument = checkIntegrity(pdfBytes, extracted.byteRange);

        // Get signed data
        const signedData = getSignedData(pdfBytes, extracted.byteRange);

        // Validate CMS signature with PKI.js
        const cmsResult = await validateCmsSignature(extracted.contents, signedData);

        // Extract signing time from CMS signed attributes (most reliable source)
        const cmsSigningTime = extractSigningTime(extracted.contents);
        if (cmsSigningTime) {
          signatureInfo.signedAt = cmsSigningTime;
        }
        // If no CMS signing time, keep the PDF dictionary time (extracted.signTime)
        // If neither exists, signedAt remains as the initial value (extracted.signTime || new Date())

        // Extract signer info from certificate
        if (cmsResult.certificate) {
          signatureInfo.certificate = cmsResult.certificate;

          // Always prioritize certificate data over PDF signature dictionary fields
          // Certificate data is cryptographically signed and has proper UTF-8 encoding
          // PDF signature dictionary fields often have encoding issues with international characters
          const signerInfo = extractSignerInfo(extracted.contents);

          // Signer name: always use certificate CN
          if (signerInfo.signerName !== 'Unknown') {
            signatureInfo.signerName = signerInfo.signerName;
          } else if (extracted.name) {
            // Only fallback to PDF field if certificate parsing completely failed
            signatureInfo.signerName = extracted.name;
          }

          // Organization: always use certificate O field
          if (signerInfo.organization) {
            signatureInfo.organization = signerInfo.organization;
          }

          // Country: extract from certificate C field
          if (signerInfo.country) {
            signatureInfo.country = signerInfo.country;
          }
        } else if (extracted.name) {
          // Fallback to name from PDF only if certificate extraction failed
          signatureInfo.signerName = extracted.name;
        }

        // Add BankID information if detected
        if (cmsResult.isBankId !== undefined) {
          signatureInfo.isBankId = cmsResult.isBankId;
          signatureInfo.bankIdCaName = cmsResult.bankIdCaName;
        }

        // Add trusted CA information
        if (cmsResult.isTrustedCA !== undefined) {
          signatureInfo.isTrustedCA = cmsResult.isTrustedCA;
          signatureInfo.trustedCAName = cmsResult.trustedCAName;
        }

        // Add algorithm information
        if (cmsResult.algorithms) {
          signatureInfo.algorithms = cmsResult.algorithms;
        }

        // Add trust status and policy warnings
        if (cmsResult.trustStatus) {
          signatureInfo.trust.status = cmsResult.trustStatus;
        }
        if (cmsResult.policyWarnings) {
          signatureInfo.trust.policyWarnings = cmsResult.policyWarnings;
        }

        // Set integrity status using precise dual-axis model:
        // 1. ByteIntegrityStatus: Pure cryptographic check (CMS verification result)
        // 2. RevisionChangeType: Analysis of later document changes

        // Set byte-level integrity from CMS validation result
        if (cmsResult.valid) {
          signatureInfo.integrity.bytes = 'INTACT';
        } else {
          signatureInfo.integrity.bytes = 'CHANGED';
        }

        // Analyze revisions: check if signature covers the last revision
        if (signatureInfo.coversWholeDocument) {
          // No changes detected after signing
          signatureInfo.integrity.revisionChange = 'NONE';
        } else {
          // For now, mark as UNKNOWN - full revision parsing not yet implemented
          // Future enhancement: parse PDF revisions and classify as MINOR vs CONTENT
          signatureInfo.integrity.revisionChange = 'UNKNOWN';
        }

        // Derive user-facing message from both dimensions
        if (signatureInfo.integrity.bytes === 'INTACT') {
          if (signatureInfo.integrity.revisionChange === 'NONE') {
            signatureInfo.integrity.message = t('integrity.message.intact_none');
            signatureInfo.integrity.status = 'OK'; // legacy field
          } else {
            // UNKNOWN, MINOR, or CONTENT - cannot determine exact change type yet
            // Future enhancement: implement revision parsing to distinguish MINOR from CONTENT
            signatureInfo.integrity.message = t('integrity.mayBeModified');
            signatureInfo.integrity.status = 'MODIFIED'; // legacy field
          }
        } else {
          // Cryptographic check failed - this is the serious case
          signatureInfo.integrity.message = t('integrity.message.cryptoFail');
          signatureInfo.integrity.status = 'MODIFIED'; // legacy field
        }

        // Set details with technical information
        if (signatureInfo.coversWholeDocument) {
          signatureInfo.integrity.details = t('integrity.coversEntire');
        } else {
          signatureInfo.integrity.details = t('integrity.mayBeModified');
        }

        // Lookup in EU Trust List (if available)
        if (isTrustListLoaded() && cmsResult.certificate) {
          try {
            const trustResult = await lookupTrust(cmsResult.certificate);
            signatureInfo.euTrustList = {
              found: trustResult.found,
              providerName: trustResult.provider?.name,
              country: trustResult.provider?.country,
              serviceType: trustResult.provider?.serviceType,
              status: trustResult.provider?.status,
              listVersion: trustResult.listVersion,
              matchedBy: trustResult.matchedBy,
            };
          } catch (error) {
            console.warn('EU Trust List lookup failed:', error);
          }
        }

        // Set validation status based on cryptographic verification
        if (cmsResult.valid) {
          signatureInfo.status = 'VALID';
        } else if (cmsResult.error) {
          signatureInfo.status = 'INVALID';
          signatureInfo.error = cmsResult.error;
        } else {
          signatureInfo.status = 'INDETERMINATE';
          signatureInfo.error = 'Could not determine signature validity';
        }

        // Check for document modification
        if (!signatureInfo.coversWholeDocument) {
          result.documentModified = true;
          const modMsg = t('integrity.mayBeModified');
          signatureInfo.error = signatureInfo.error
            ? `${signatureInfo.error}; ${modMsg}`
            : modMsg;
        }
      } catch (error) {
        signatureInfo.status = 'INDETERMINATE';
        signatureInfo.error =
          error instanceof Error ? error.message : 'Validation failed';
      }

      return signatureInfo;
    });

    result.signatures = await Promise.all(signaturePromises);

    // Determine overall status
    const hasInvalid = result.signatures.some((sig) => sig.status === 'INVALID');
    const hasIndeterminate = result.signatures.some((sig) => sig.status === 'INDETERMINATE');
    const allValid = result.signatures.every((sig) => sig.status === 'VALID');

    if (hasInvalid) {
      result.overallStatus = 'INVALID';
    } else if (allValid && !result.documentModified) {
      result.overallStatus = 'VALID';
    } else if (hasIndeterminate) {
      result.overallStatus = 'INDETERMINATE';
    } else {
      result.overallStatus = 'INDETERMINATE';
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Validation failed';
    result.overallStatus = 'INVALID';
  }

  return result;
}

/**
 * Validate PDF from File object
 */
export async function validatePdfFile(file: File): Promise<ValidationResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfBytes = new Uint8Array(arrayBuffer);
  return validatePdfBytes(pdfBytes);
}

/**
 * Quick check if a file appears to be a PDF
 */
export function isPdfFile(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;

  // Check for PDF magic number: %PDF-
  const header = String.fromCharCode(...bytes.slice(0, 5));
  return header === '%PDF-';
}

// UI mapping functions moved to mapping.ts
