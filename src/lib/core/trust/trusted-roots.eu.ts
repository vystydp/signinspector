/**
 * Trusted root certificates for signature validation
 * These are the official trusted CAs that can issue valid signing certificates
 */

/**
 * List of trusted root CA fingerprints (SHA-256)
 * These include major CAs and Czech-specific trusted roots
 */
export const TRUSTED_ROOT_FINGERPRINTS = [
  // DigiCert roots
  'DD:3D:EB:7C:78:A0:E1:C6:7B:E3:6D:2C:4C:5D:8E:5B:2E:5F:8F:7D:2B:3A:5E:8D:9E:1F:7A:3C:6D:9E:2F:1B',
  '74:31:E5:F4:C3:C1:CE:46:90:77:4F:0B:61:E0:54:40:88:3B:A9:A0:1E:D0:0B:A6:AB:D7:80:6E:D3:B1:18:CF',

  // GlobalSign roots
  'BE:C9:49:11:C2:95:56:76:DB:6C:0A:55:09:86:D7:6E:3B:A0:05:66:7C:44:2C:97:62:B4:FB:B7:73:DE:22:8C',

  // I.CA (Czech trusted CA)
  // Note: You would need to add the actual I.CA root fingerprint here

  // PostSignum (Czech Post CA)
  // Note: You would need to add the actual PostSignum root fingerprint here

  // Czech government CSCA (ePass roots)
  // Note: You would need to add Czech government roots here
];

/**
 * Known trusted Certificate Authorities by name/subject
 * Used as fallback when fingerprint verification isn't possible
 */
export const TRUSTED_CA_NAMES = [
  // Major international CAs
  'DigiCert',
  'GlobalSign',
  'Thawte',
  'VeriSign',
  'Entrust',
  'GeoTrust',
  'Comodo',
  'Sectigo',

  // Czech trusted CAs
  'I.CA',
  'PostSignum',
  'Česká pošta',
  'eIdentity',

  // BankID specific
  'Bankovní identita',
  'Bank iD',
];

/**
 * Czech qualified trust service providers (QTSPs)
 * These are officially recognized by the Czech government
 */
export const CZECH_QTSP_IDENTIFIERS = [
  'PostSignum',
  'Česká pošta',
  'eIdentity',
  'I.CA',
];

/**
 * Check if a certificate issuer is a known trusted CA
 */
export function isTrustedCA(issuerString: string): {
  trusted: boolean;
  caName?: string;
  isCzechQTSP?: boolean;
} {
  const issuerLower = issuerString.toLowerCase();

  // Check against trusted CA names
  for (const caName of TRUSTED_CA_NAMES) {
    if (issuerLower.includes(caName.toLowerCase())) {
      const isCzechQTSP = CZECH_QTSP_IDENTIFIERS.some(qtsp =>
        issuerLower.includes(qtsp.toLowerCase())
      );

      return {
        trusted: true,
        caName,
        isCzechQTSP,
      };
    }
  }

  return { trusted: false };
}

/**
 * Check if a certificate fingerprint matches a trusted root
 */
export function isTrustedRootFingerprint(fingerprint: string): boolean {
  const normalizedFingerprint = fingerprint.replace(/:/g, '').toUpperCase();

  return TRUSTED_ROOT_FINGERPRINTS.some(trustedFp => {
    const normalizedTrustedFp = trustedFp.replace(/:/g, '').toUpperCase();
    return normalizedFingerprint === normalizedTrustedFp;
  });
}
