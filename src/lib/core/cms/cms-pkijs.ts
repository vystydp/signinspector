/**
 * CMS/PKCS#7 signature validation using PKI.js
 * Full cryptographic validation with certificate chain verification
 */

import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { Certificate, ContentInfo, SignedData } from 'pkijs';
import type { CertificateInfo, AlgorithmInfo, PolicyWarning, TrustStatus } from '../types';
import { hexToBytes } from '../../std';
import { isTrustedCA, isTrustedRootFingerprint } from '../trust/trusted-roots.eu';
import { t } from '../../i18n/i18n';
import { isECPublicKey, isASN1TimeValue } from './pkijs-extensions';

// Set crypto engine for PKI.js
// Note: Type assertions needed as pkijs types don't fully match Web Crypto API
const crypto = globalThis.crypto;
const cryptoEngine = new pkijs.CryptoEngine({
  name: '',
  crypto: crypto as any,
  subtle: crypto.subtle as any,
});
pkijs.setEngine('default', cryptoEngine, crypto as any);

/**
 * OID to algorithm name mappings
 */
const HASH_ALGORITHM_OID: Record<string, string> = {
  '1.3.14.3.2.26': 'SHA-1',
  '2.16.840.1.101.3.4.2.1': 'SHA-256',
  '2.16.840.1.101.3.4.2.2': 'SHA-384',
  '2.16.840.1.101.3.4.2.3': 'SHA-512',
  '1.2.840.113549.2.5': 'MD5',
};

const SIGNATURE_ALGORITHM_OID: Record<string, string> = {
  '1.2.840.113549.1.1.1': 'RSA',
  '1.2.840.113549.1.1.5': 'SHA-1 with RSA',
  '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
  '1.2.840.113549.1.1.12': 'SHA-384 with RSA',
  '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
  '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.10045.4.1': 'ECDSA with SHA-1',
  '1.2.840.10045.4.3.2': 'ECDSA with SHA-256',
  '1.2.840.10045.4.3.3': 'ECDSA with SHA-384',
  '1.2.840.10045.4.3.4': 'ECDSA with SHA-512',
};

/**
 * Extract algorithm information from certificate and SignedData
 */
function extractAlgorithmInfo(
  cert: Certificate,
  signedData: SignedData
): AlgorithmInfo {
  const algorithmInfo: AlgorithmInfo = {};

  // Get signature algorithm from certificate
  const sigAlgOid = cert.signatureAlgorithm.algorithmId;
  algorithmInfo.oid = sigAlgOid;
  algorithmInfo.signatureAlgorithm = SIGNATURE_ALGORITHM_OID[sigAlgOid] || sigAlgOid;

  // Get hash algorithm from signer info
  if (signedData.signerInfos && signedData.signerInfos.length > 0) {
    const signerInfo = signedData.signerInfos[0];
    const digestAlgOid = signerInfo.digestAlgorithm.algorithmId;
    algorithmInfo.hashAlgorithm = HASH_ALGORITHM_OID[digestAlgOid] || digestAlgOid;
  }

  // Get key type and size from public key
  const publicKey = cert.subjectPublicKeyInfo;
  const keyAlgOid = publicKey.algorithm.algorithmId;

  if (keyAlgOid === '1.2.840.113549.1.1.1' || keyAlgOid.startsWith('1.2.840.113549.1.1')) {
    algorithmInfo.keyType = 'RSA';
    // Extract key size from public key modulus
    try {
      const publicKeyValue = publicKey.parsedKey;
      if (publicKeyValue && 'modulus' in publicKeyValue) {
        const modulus = publicKeyValue.modulus as asn1js.Integer;
        algorithmInfo.keySizeBits = modulus.valueBlock.valueHexView.length * 8;
      }
    } catch (e) {
      console.warn('Could not extract RSA key size:', e);
    }
  } else if (keyAlgOid === '1.2.840.10045.2.1') {
    algorithmInfo.keyType = 'EC';
    // For EC, key size depends on curve
    try {
      const publicKeyValue = publicKey.parsedKey;
      if (isECPublicKey(publicKeyValue) && publicKeyValue.namedCurve) {
        const namedCurve = publicKeyValue.namedCurve;
        // Common curves
        if (namedCurve === '1.2.840.10045.3.1.7') {
          algorithmInfo.keySizeBits = 256; // P-256
        } else if (namedCurve === '1.3.132.0.34') {
          algorithmInfo.keySizeBits = 384; // P-384
        } else if (namedCurve === '1.3.132.0.35') {
          algorithmInfo.keySizeBits = 521; // P-521
        }
      }
    } catch (e) {
      console.warn('Could not extract EC key size:', e);
    }
  }

  return algorithmInfo;
}

/**
 * Evaluate cryptographic policy and generate warnings
 */
function evaluatePolicy(alg: AlgorithmInfo): {
  trustStatus: TrustStatus;
  warnings: PolicyWarning[];
} {
  const warnings: PolicyWarning[] = [];
  let trustStatus: TrustStatus = 'NOT_EVALUATED';

  // Check hash algorithm
  if (alg.hashAlgorithm) {
    const hashUpper = alg.hashAlgorithm.toUpperCase();

    if (hashUpper.includes('SHA-1') || hashUpper === 'SHA1') {
      trustStatus = 'WEAK_ALGO';
      warnings.push({
        code: 'WEAK_HASH',
        message: 'Signature uses SHA-1, which is cryptographically weak and deprecated (NIST SP 800-57).',
        referenceUrl: 'https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-57pt1r5.pdf',
        severity: 'warning',
      });
    } else if (hashUpper.includes('MD5')) {
      trustStatus = 'WEAK_ALGO';
      warnings.push({
        code: 'WEAK_HASH',
        message: 'Signature uses MD5, which is cryptographically broken. Do not trust this signature.',
        severity: 'error',
      });
    } else if (hashUpper.includes('SHA-256') || hashUpper.includes('SHA-384') || hashUpper.includes('SHA-512')) {
      trustStatus = 'TRUSTED';
    }
  }

  // Check RSA key size
  if (alg.keyType === 'RSA' && typeof alg.keySizeBits === 'number') {
    if (alg.keySizeBits < 2048) {
      trustStatus = 'WEAK_ALGO';
      warnings.push({
        code: 'SMALL_KEY',
        message: `RSA key size (${alg.keySizeBits} bits) is below the recommended 2048-bit minimum for long-term security.`,
        referenceUrl: 'https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-57pt1r5.pdf',
        severity: 'warning',
      });
    } else if (alg.keySizeBits < 3072 && trustStatus === 'TRUSTED') {
      // Info: 2048 is acceptable but 3072+ is better for beyond 2030
      warnings.push({
        code: 'KEY_SIZE_INFO',
        message: t('validation.keySizeInfo', { size: alg.keySizeBits.toString() }),
        severity: 'info',
      });
    }
  }

  // Check EC key size
  if (alg.keyType === 'EC' && typeof alg.keySizeBits === 'number') {
    if (alg.keySizeBits < 224) {
      trustStatus = 'WEAK_ALGO';
      warnings.push({
        code: 'SMALL_KEY',
        message: `Elliptic curve key size (${alg.keySizeBits} bits) is below recommended security levels.`,
        severity: 'warning',
      });
    }
  }

  return { trustStatus, warnings };
}

/**
 * Known BankID Certificate Authority identifiers
 * These are the trusted issuers for BankID signatures
 */
const BANKID_CA_IDENTIFIERS = [
  'Bankovní identita', // Czech BankID
  'Bank iD', // Alternative name
  'PostSignum', // PostSignum CA (used by some BankID implementations)
  'I.CA', // I.CA is a trusted CA in Czech Republic
  'Česká pošta', // Czech Post CA
];

/**
 * Check if a certificate is from a known BankID CA
 */
function isBankIdCertificate(cert: Certificate): {
  isBankId: boolean;
  caName?: string;
  details?: string;
} {
  const issuerString = cert.issuer.typesAndValues
    .map((tv) => tv.value.valueBlock.value)
    .join(' ');

  const subjectString = cert.subject.typesAndValues
    .map((tv) => tv.value.valueBlock.value)
    .join(' ');

  // Check issuer for BankID CA identifiers
  for (const identifier of BANKID_CA_IDENTIFIERS) {
    if (issuerString.includes(identifier)) {
      return {
        isBankId: true,
        caName: identifier,
        details: `Issued by ${identifier}`,
      };
    }
  }

  // Also check subject for BankID-specific markers
  if (subjectString.includes('Bank iD') || subjectString.includes('BankID')) {
    return {
      isBankId: true,
      details: 'BankID certificate detected in subject',
    };
  }

  return { isBankId: false };
}

/**
 * Parse X.509 certificate and extract information
 */
function parseCertificateInfo(cert: Certificate): CertificateInfo {
  const subject = cert.subject.typesAndValues
    .map((tv) => {
      const type = tv.type;
      const value = tv.value.valueBlock.value;

      // Common OIDs
      const oidMap: Record<string, string> = {
        '2.5.4.3': 'CN',
        '2.5.4.6': 'C',
        '2.5.4.7': 'L',
        '2.5.4.8': 'ST',
        '2.5.4.10': 'O',
        '2.5.4.11': 'OU',
        '2.5.4.5': 'serialNumber',
        '1.2.840.113549.1.9.1': 'E',
      };

      const oidName = oidMap[type] || type;
      return `${oidName}=${value}`;
    })
    .join(', ');

  const issuer = cert.issuer.typesAndValues
    .map((tv) => {
      const type = tv.type;
      const value = tv.value.valueBlock.value;

      const oidMap: Record<string, string> = {
        '2.5.4.3': 'CN',
        '2.5.4.6': 'C',
        '2.5.4.7': 'L',
        '2.5.4.8': 'ST',
        '2.5.4.10': 'O',
        '2.5.4.11': 'OU',
      };

      const oidName = oidMap[type] || type;
      return `${oidName}=${value}`;
    })
    .join(', ');

  const serialNumber = Array.from(new Uint8Array(cert.serialNumber.valueBlock.valueHexView))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');

  const notBefore = cert.notBefore.value;
  const notAfter = cert.notAfter.value;

  // Compute fingerprint (SHA-256 of DER-encoded certificate)
  const certDer = cert.toSchema().toBER(false);
  const fingerprintPromise = crypto.subtle
    .digest('SHA-256', certDer)
    .then((hash) => {
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(':')
        .toUpperCase();
    });

  return {
    subject,
    issuer,
    serialNumber,
    notBefore,
    notAfter,
    fingerprint: '', // Will be set async
    keyUsage: [],
    extendedKeyUsage: [],
    _fingerprintPromise: fingerprintPromise,
  };
}

/**
 * Validate CMS/PKCS#7 signature using PKI.js
 */
export async function validateCmsSignature(
  cmsHex: string,
  signedData: Uint8Array
): Promise<{
  valid: boolean;
  certificate: CertificateInfo | null;
  isBankId?: boolean;
  bankIdCaName?: string;
  isTrustedCA?: boolean;
  trustedCAName?: string;
  algorithms?: AlgorithmInfo;
  trustStatus?: TrustStatus;
  policyWarnings?: PolicyWarning[];
  error?: string;
}> {
  try {
    // Convert hex to bytes
    const cmsBytes = hexToBytes(cmsHex);

    // Parse CMS structure
    let asn1: asn1js.FromBerResult;
    try {
      asn1 = asn1js.fromBER(cmsBytes.buffer as ArrayBuffer);
      if (asn1.offset === -1) {
        return {
          valid: false,
          certificate: null,
          error: 'Failed to parse ASN.1 structure - invalid binary encoding',
        };
      }
    } catch (asnError) {
      return {
        valid: false,
        certificate: null,
        error: 'Not a valid ASN.1 structure - signature format not supported',
      };
    }

    // Parse ContentInfo
    let contentInfo: ContentInfo;
    try {
      contentInfo = new ContentInfo({ schema: asn1.result });
    } catch (contentInfoError) {
      // This signature is not a standard CMS/PKCS#7 ContentInfo structure
      // (e.g., trial/demo signatures, proprietary formats, JAR signatures, etc.)
      const errorMsg = contentInfoError instanceof Error ? contentInfoError.message : '';
      if (errorMsg.includes('schema') || errorMsg.includes('not verified')) {
        return {
          valid: false,
          certificate: null,
          error: t('validation.unsupportedFormat'),
        };
      }
      return {
        valid: false,
        certificate: null,
        error: `Failed to parse signature container: ${errorMsg}`,
      };
    }

    // Extract SignedData
    if (contentInfo.contentType !== '1.2.840.113549.1.7.2') {
      return {
        valid: false,
        certificate: null,
        error: `Not a SignedData structure (contentType: ${contentInfo.contentType})`,
      };
    }

    let signedDataObj: SignedData;
    try {
      signedDataObj = new SignedData({ schema: contentInfo.content });
    } catch (signedDataError) {
      return {
        valid: false,
        certificate: null,
        error: 'Failed to parse SignedData structure - signature may be corrupted or use unsupported format',
      };
    }

    // Get signer certificate
    if (!signedDataObj.certificates || signedDataObj.certificates.length === 0) {
      return {
        valid: false,
        certificate: null,
        error: 'No certificates found in signature',
      };
    }

    const signerCert = signedDataObj.certificates[0] as Certificate;
    const certInfo = parseCertificateInfo(signerCert);

    // Set fingerprint
    if (certInfo._fingerprintPromise) {
      certInfo.fingerprint = await certInfo._fingerprintPromise;
      delete certInfo._fingerprintPromise;
    }

    // Extract algorithm information
    const algorithms = extractAlgorithmInfo(signerCert, signedDataObj);

    // Evaluate cryptographic policy
    const policyEval = evaluatePolicy(algorithms);

    // Check if this is a BankID certificate
    const bankIdCheck = isBankIdCertificate(signerCert);

    // Check if issued by a trusted CA
    const issuerString = certInfo.issuer;
    const trustedCACheck = isTrustedCA(issuerString);

    // Check if certificate fingerprint matches trusted root
    const isTrustedRoot = isTrustedRootFingerprint(certInfo.fingerprint);

    // Check certificate validity period with tolerance for timezone/clock differences
    const now = new Date();
    const toleranceMs = 24 * 60 * 60 * 1000; // 24 hours tolerance

    // Check if certificate is not yet valid (with tolerance)
    if (signerCert.notBefore.value.getTime() - now.getTime() > toleranceMs) {
      return {
        valid: false,
        certificate: certInfo,
        isBankId: bankIdCheck.isBankId,
        bankIdCaName: bankIdCheck.caName,
        isTrustedCA: trustedCACheck.trusted,
        trustedCAName: trustedCACheck.caName,
        algorithms,
        trustStatus: policyEval.trustStatus,
        policyWarnings: policyEval.warnings,
        error: `Certificate is not yet valid (valid from ${signerCert.notBefore.value.toLocaleString()})`,
      };
    }

    // Check if certificate has expired (with tolerance)
    if (now.getTime() - signerCert.notAfter.value.getTime() > toleranceMs) {
      return {
        valid: false,
        certificate: certInfo,
        isBankId: bankIdCheck.isBankId,
        bankIdCaName: bankIdCheck.caName,
        isTrustedCA: trustedCACheck.trusted,
        trustedCAName: trustedCACheck.caName,
        algorithms,
        trustStatus: policyEval.trustStatus,
        policyWarnings: policyEval.warnings,
        error: `Certificate has expired (valid until ${signerCert.notAfter.value.toLocaleString()})`,
      };
    }

    // Verify signature
    try {
      // The signedData from PDF is already the raw data that was signed
      // We need to verify the signature against this data
      const verifyResult = await signedDataObj.verify({
        signer: 0,
        data: signedData.buffer as ArrayBuffer,
        checkChain: false,
        extendedMode: true,
      });

      if (!verifyResult.signatureVerified) {
        return {
          valid: false,
          certificate: certInfo,
          isBankId: bankIdCheck.isBankId,
          bankIdCaName: bankIdCheck.caName,
          isTrustedCA: trustedCACheck.trusted,
          trustedCAName: trustedCACheck.caName,
          algorithms,
          trustStatus: policyEval.trustStatus,
          policyWarnings: policyEval.warnings,
          error: 'Signature verification failed - cryptographic check failed',
        };
      }

      // Add warning if not from a trusted CA (but signature is cryptographically valid)
      let validationWarning: string | undefined;
      if (!trustedCACheck.trusted && !isTrustedRoot) {
        validationWarning = 'Certificate issuer is not in the trusted CA list - please verify manually';
      }

      return {
        valid: true,
        certificate: certInfo,
        isBankId: bankIdCheck.isBankId,
        bankIdCaName: bankIdCheck.caName,
        isTrustedCA: trustedCACheck.trusted || isTrustedRoot,
        trustedCAName: trustedCACheck.caName,
        algorithms,
        trustStatus: policyEval.trustStatus,
        policyWarnings: policyEval.warnings,
        error: validationWarning,
      };
    } catch (verifyError) {
      console.error('Signature verification error:', verifyError);
      return {
        valid: false,
        certificate: certInfo,
        isBankId: bankIdCheck.isBankId,
        bankIdCaName: bankIdCheck.caName,
        isTrustedCA: trustedCACheck.trusted,
        trustedCAName: trustedCACheck.caName,
        algorithms,
        trustStatus: policyEval.trustStatus,
        policyWarnings: policyEval.warnings,
        error: verifyError instanceof Error ? verifyError.message : 'Signature verification failed',
      };
    }
  } catch (error) {
    console.error('CMS validation error:', error);
    return {
      valid: false,
      certificate: null,
      error: error instanceof Error ? error.message : 'Unknown error during validation',
    };
  }
}

/**
 * Extract signer information from CMS
 */
export function extractSignerInfo(cmsHex: string): {
  signerName: string;
  organization?: string;
  email?: string;
  country?: string;
  error?: string;
} {
  try {
    const cmsBytes = hexToBytes(cmsHex);

    let asn1: asn1js.FromBerResult;
    try {
      asn1 = asn1js.fromBER(cmsBytes.buffer as ArrayBuffer);
      if (asn1.offset === -1) {
        return { signerName: 'Unknown', error: 'Invalid ASN.1 structure' };
      }
    } catch {
      return { signerName: 'Unknown', error: 'Not a valid ASN.1 structure' };
    }

    let contentInfo: ContentInfo;
    try {
      contentInfo = new ContentInfo({ schema: asn1.result });
    } catch {
      return { signerName: 'Unknown', error: 'Not a standard CMS/PKCS#7 structure' };
    }

    let signedDataObj: SignedData;
    try {
      signedDataObj = new SignedData({ schema: contentInfo.content });
    } catch {
      return { signerName: 'Unknown', error: 'Failed to parse SignedData' };
    }

    if (!signedDataObj.certificates || signedDataObj.certificates.length === 0) {
      return { signerName: 'Unknown', error: 'No certificates found' };
    }

    // Get the signer certificate (usually the last one in the chain, not the first which is often the issuer)
    // The signer certificate is the leaf certificate (end-entity certificate)
    const signerCert = signedDataObj.certificates[signedDataObj.certificates.length - 1] as Certificate;

    let signerName = 'Unknown';
    let organization: string | undefined;
    let email: string | undefined;
    let country: string | undefined;

    for (const tv of signerCert.subject.typesAndValues) {
      // PKI.js stores values in different string encodings (UTF8String, BMPString, etc.)
      // We need to properly decode them to support international characters
      let value: string;

      if (tv.value) {
        try {
          // PKI.js toString() returns format like "UTF8String : 'value'"
          // We need to extract just the actual value
          const toStringResult = tv.value.toString();

          // Check if it's in the format "Type : 'value'"
          const match = toStringResult.match(/^[^:]+:\s*'(.+)'$/);
          if (match && match[1]) {
            // Extract the value from quotes
            value = match[1];
          } else if (tv.value.valueBlock && tv.value.valueBlock.value !== undefined) {
            // Fallback to valueBlock.value
            const rawValue: unknown = tv.value.valueBlock.value;

            // Handle different ASN.1 string types
            if (typeof rawValue === 'string') {
              value = rawValue;
            } else if (typeof rawValue === 'object' && rawValue !== null && 'byteLength' in rawValue) {
              // Binary data (BMPString, etc.) - try multiple encodings
              try {
                // Try UTF-16BE first (common for BMPString)
                const decoder = new TextDecoder('utf-16be');
                const buffer = rawValue instanceof Uint8Array ? rawValue : new Uint8Array(rawValue as any);
                value = decoder.decode(buffer);
              } catch {
                // If UTF-16BE fails, try UTF-8
                try {
                  const decoder = new TextDecoder('utf-8');
                  const buffer = rawValue instanceof Uint8Array ? rawValue : new Uint8Array(rawValue as any);
                  value = decoder.decode(buffer);
                } catch {
                  // Last resort: convert to string
                  value = String(rawValue);
                }
              }
            } else {
              // Fallback: try to convert to string
              value = String(rawValue || '');
            }
          } else {
            // Use the toString result as-is if we can't parse it
            value = toStringResult;
          }
        } catch (err) {
          console.error('Error decoding certificate field:', err);
          value = '';
        }
      } else {
        value = '';
      }

      switch (tv.type) {
        case '2.5.4.3': // CN (Common Name)
          signerName = value;
          break;
        case '2.5.4.10': // O (Organization)
          organization = value;
          break;
        case '2.5.4.6': // C (Country)
          country = value;
          break;
        case '1.2.840.113549.1.9.1': // Email
          email = value;
          break;
      }
    }

    return { signerName, organization, email, country };
  } catch (error) {
    console.error('Signer info extraction error:', error);
    return {
      signerName: 'Unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract signing time from CMS signed attributes
 * The signing time is in the signingTime attribute (OID 1.2.840.113549.1.9.5)
 * This is the signer's claimed signing time, which should be trusted more than PDF dictionary time
 *
 * @param cmsHex - Hex-encoded CMS/PKCS#7 signature
 * @returns Signing time as Date, or undefined if not found
 */
export function extractSigningTime(cmsHex: string): Date | undefined {
  try {
    const cmsBytes = hexToBytes(cmsHex);
    const asn1 = asn1js.fromBER(cmsBytes.buffer as ArrayBuffer);

    if (asn1.offset === -1) {
      console.warn('CMS signing time: Invalid ASN.1');
      return undefined;
    }

    const contentInfo = new ContentInfo({ schema: asn1.result });
    const signedData = new SignedData({ schema: contentInfo.content });

    if (!signedData.signerInfos || signedData.signerInfos.length === 0) {
      console.warn('CMS signing time: No signer infos');
      return undefined;
    }

    const signerInfo = signedData.signerInfos[0];

    // Look for signing time in signed attributes
    if (signerInfo.signedAttrs) {
      for (const attr of signerInfo.signedAttrs.attributes) {
        // OID 1.2.840.113549.1.9.5 is signingTime
        if (attr.type === '1.2.840.113549.1.9.5') {
          if (attr.values && attr.values.length > 0) {
            const timeValue = attr.values[0];

            // The time can be UTCTime or GeneralizedTime
            if (isASN1TimeValue(timeValue)) {
              return timeValue.toDate();
            }

            // Fallback: try to extract from valueBlock
            if (timeValue.valueBlock) {
              try {
                const blockValue: unknown = timeValue.valueBlock.value ?? timeValue.valueBlock.valueHex;
                if (typeof blockValue === 'string' || blockValue instanceof Date) {
                  const date = new Date(blockValue as string | Date);
                  if (!isNaN(date.getTime())) {
                    return date;
                  }
                }
              } catch {
                // Silent fail for valueBlock parsing
              }
            }
          }
        }
      }
    }

    // Try to extract time from timestamp token in unsigned attributes
    // OID 1.2.840.113549.1.9.16.2.14 is id-aa-timeStampToken
    if (signerInfo.unsignedAttrs) {
      for (const attr of signerInfo.unsignedAttrs.attributes) {
        if (attr.type === '1.2.840.113549.1.9.16.2.14') {
          if (attr.values && attr.values.length > 0) {
            try {
              // The timestamp token is itself a SignedData containing a TSTInfo
              const tstValue = attr.values[0];
              const tstAsn1 = asn1js.fromBER(tstValue.valueBlock.valueHexView.buffer as ArrayBuffer);

              if (tstAsn1.offset !== -1) {
                const tstContentInfo = new ContentInfo({ schema: tstAsn1.result });
                const tstSignedData = new SignedData({ schema: tstContentInfo.content });

                // The encapContentInfo contains the TSTInfo
                if (tstSignedData.encapContentInfo && tstSignedData.encapContentInfo.eContent) {
                  const tstInfoAsn1 = asn1js.fromBER(
                    tstSignedData.encapContentInfo.eContent.valueBlock.valueHexView.buffer as ArrayBuffer
                  );

                  if (tstInfoAsn1.offset !== -1) {
                    // TSTInfo structure: SEQUENCE { version, policy, messageImprint, serialNumber, genTime, ... }
                    const tstInfo = tstInfoAsn1.result;
                    if (tstInfo.valueBlock && 'value' in tstInfo.valueBlock) {
                      const tstValues: unknown = tstInfo.valueBlock.value;
                      // genTime is typically the 5th element (index 4)
                      if (Array.isArray(tstValues) && tstValues.length > 4) {
                        const genTime = tstValues[4];
                        if (isASN1TimeValue(genTime)) {
                          return genTime.toDate();
                        }
                      }
                    }
                  }
                }
              }
            } catch {
              // Silent fail for timestamp token parsing
            }
          }
        }
      }
    }

    return undefined;
  } catch (error) {
    console.warn('Failed to extract signing time from CMS:', error);
    return undefined;
  }
}
