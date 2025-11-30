/**
 * Common OID (Object Identifier) constants for CMS/PKCS#7
 */

export const OIDs = {
  // Content types
  DATA: '1.2.840.113549.1.7.1',
  SIGNED_DATA: '1.2.840.113549.1.7.2',
  ENVELOPED_DATA: '1.2.840.113549.1.7.3',

  // Hash algorithms
  SHA1: '1.3.14.3.2.26',
  SHA256: '2.16.840.1.101.3.4.2.1',
  SHA384: '2.16.840.1.101.3.4.2.2',
  SHA512: '2.16.840.1.101.3.4.2.3',
  SHA224: '2.16.840.1.101.3.4.2.4',

  // Signature algorithms
  RSA_ENCRYPTION: '1.2.840.113549.1.1.1',
  RSA_WITH_SHA1: '1.2.840.113549.1.1.5',
  RSA_WITH_SHA256: '1.2.840.113549.1.1.11',
  RSA_WITH_SHA384: '1.2.840.113549.1.1.12',
  RSA_WITH_SHA512: '1.2.840.113549.1.1.13',

  // EC algorithms
  EC_PUBLIC_KEY: '1.2.840.10045.2.1',
  ECDSA_WITH_SHA256: '1.2.840.10045.4.3.2',
  ECDSA_WITH_SHA384: '1.2.840.10045.4.3.3',
  ECDSA_WITH_SHA512: '1.2.840.10045.4.3.4',

  // Certificate attributes
  COMMON_NAME: '2.5.4.3',
  ORGANIZATION: '2.5.4.10',
  ORGANIZATIONAL_UNIT: '2.5.4.11',
  COUNTRY: '2.5.4.6',

  // Extensions
  KEY_USAGE: '2.5.29.15',
  EXTENDED_KEY_USAGE: '2.5.29.37',
  SUBJECT_ALT_NAME: '2.5.29.17',
  SUBJECT_KEY_IDENTIFIER: '2.5.29.14',
  AUTHORITY_KEY_IDENTIFIER: '2.5.29.35',
} as const;

/**
 * Get human-readable name for an OID
 */
export function getOIDName(oid: string): string {
  const names: Record<string, string> = {
    [OIDs.SHA1]: 'SHA-1',
    [OIDs.SHA256]: 'SHA-256',
    [OIDs.SHA384]: 'SHA-384',
    [OIDs.SHA512]: 'SHA-512',
    [OIDs.SHA224]: 'SHA-224',
    [OIDs.RSA_ENCRYPTION]: 'RSA',
    [OIDs.RSA_WITH_SHA1]: 'RSA with SHA-1',
    [OIDs.RSA_WITH_SHA256]: 'RSA with SHA-256',
    [OIDs.RSA_WITH_SHA384]: 'RSA with SHA-384',
    [OIDs.RSA_WITH_SHA512]: 'RSA with SHA-512',
    [OIDs.EC_PUBLIC_KEY]: 'EC',
    [OIDs.ECDSA_WITH_SHA256]: 'ECDSA with SHA-256',
    [OIDs.ECDSA_WITH_SHA384]: 'ECDSA with SHA-384',
    [OIDs.ECDSA_WITH_SHA512]: 'ECDSA with SHA-512',
  };

  return names[oid] || oid;
}
