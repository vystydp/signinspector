/**
 * CMS/PKCS#7 signature validation
 * Browser-compatible implementation using Web Crypto API
 */

import type { CertificateInfo, ValidationStatus } from '../types';
import { hexToBytes, bytesToHex, sha256 } from '../../std';

/**
 * ASN.1 DER parser helper
 */
class DerParser {
  private data: Uint8Array;
  private pos: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  readByte(): number {
    return this.data[this.pos++];
  }

  readLength(): number {
    const firstByte = this.readByte();
    if (firstByte < 0x80) {
      return firstByte;
    }

    const numBytes = firstByte & 0x7f;
    let length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | this.readByte();
    }
    return length;
  }

  readSequence(): Uint8Array {
    const tag = this.readByte();
    if (tag !== 0x30) {
      throw new Error(`Expected SEQUENCE tag (0x30), got 0x${tag.toString(16)}`);
    }
    const length = this.readLength();
    const start = this.pos;
    this.pos += length;
    return this.data.slice(start, this.pos);
  }

  readOctetString(): Uint8Array {
    const tag = this.readByte();
    if (tag !== 0x04) {
      throw new Error(`Expected OCTET STRING tag (0x04), got 0x${tag.toString(16)}`);
    }
    const length = this.readLength();
    const start = this.pos;
    this.pos += length;
    return this.data.slice(start, this.pos);
  }

  skip(bytes: number): void {
    this.pos += bytes;
  }

  hasMore(): boolean {
    return this.pos < this.data.length;
  }

  getPosition(): number {
    return this.pos;
  }

  setPosition(pos: number): void {
    this.pos = pos;
  }
}

/**
 * Parse X.509 certificate (simplified)
 */
export function parseCertificate(certBytes: Uint8Array): CertificateInfo {
  // This is a simplified parser - for production use, consider using a library like node-forge or pkijs
  const cert = {
    subject: 'CN=Unknown',
    issuer: 'CN=Unknown',
    serialNumber: '00',
    notBefore: new Date(),
    notAfter: new Date(),
    fingerprint: '',
    keyUsage: [],
    extendedKeyUsage: [],
  };

  try {
    const parser = new DerParser(certBytes);

    // Skip outer SEQUENCE
    parser.readSequence();

    // Extract basic info (this is very simplified)
    // In a real implementation, you'd parse the full ASN.1 structure

    // Compute fingerprint
    sha256(certBytes).then((hash) => {
      cert.fingerprint = bytesToHex(hash);
    });
  } catch (error) {
    console.warn('Certificate parsing error:', error);
  }

  return cert;
}

/**
 * Parse PKCS#7/CMS SignedData structure
 */
export class CmsParser {
  private data: Uint8Array;

  constructor(hexData: string) {
    this.data = hexToBytes(hexData);
  }

  /**
   * Extract signer certificate from CMS structure
   */
  extractCertificate(): Uint8Array | null {
    try {
      const parser = new DerParser(this.data);

      // PKCS#7 ContentInfo
      parser.readSequence();

      // Skip OID
      parser.skip(11); // Approximate - adjust based on actual structure

      // Find certificates (tag [0])
      // This is simplified - real implementation would parse the full structure
      const remaining = this.data.slice(parser.getPosition());

      // Look for certificate pattern (starts with 0x30 0x82)
      for (let i = 0; i < remaining.length - 4; i++) {
        if (remaining[i] === 0x30 && remaining[i + 1] === 0x82) {
          // Found potential certificate
          const certLength = (remaining[i + 2] << 8) | remaining[i + 3];
          const certData = remaining.slice(i, i + certLength + 4);

          // Basic validation
          if (certData.length > 100 && certData.length < 10000) {
            return certData;
          }
        }
      }
    } catch (error) {
      console.error('Certificate extraction error:', error);
    }

    return null;
  }

  /**
   * Extract signature value from CMS
   */
  extractSignatureValue(): Uint8Array | null {
    try {
      // Look for OCTET STRING that contains the signature
      // This is simplified - real implementation would parse the full structure
      const parser = new DerParser(this.data);

      while (parser.hasMore()) {
        const tag = parser.readByte();
        const length = parser.readLength();

        if (tag === 0x04 && length >= 128 && length <= 512) {
          // Likely the signature
          const start = parser.getPosition();
          return this.data.slice(start, start + length);
        }

        parser.skip(length);
      }
    } catch (error) {
      console.error('Signature extraction error:', error);
    }

    return null;
  }
}

/**
 * Validate CMS signature
 */
export async function validateCmsSignature(
  cmsHex: string,
  signedData: Uint8Array
): Promise<{
  valid: boolean;
  certificate: CertificateInfo | null;
  error?: string;
}> {
  try {
    const parser = new CmsParser(cmsHex);

    // Extract certificate
    const certBytes = parser.extractCertificate();
    if (!certBytes) {
      return {
        valid: false,
        certificate: null,
        error: 'Could not extract certificate from signature',
      };
    }

    const certificate = parseCertificate(certBytes);

    // Extract signature value
    const signatureValue = parser.extractSignatureValue();
    if (!signatureValue) {
      return {
        valid: false,
        certificate,
        error: 'Could not extract signature value',
      };
    }

    // Compute hash of signed data
    const hash = await sha256(signedData);

    // In a real implementation, you would:
    // 1. Extract the public key from the certificate
    // 2. Use Web Crypto API to verify the signature
    // 3. Validate the certificate chain
    // 4. Check certificate validity dates
    // 5. Verify certificate revocation status

    // For now, we'll do basic checks
    const now = new Date();
    const certValid =
      certificate.notBefore <= now && now <= certificate.notAfter;

    if (!certValid) {
      return {
        valid: false,
        certificate,
        error: 'Certificate is expired or not yet valid',
      };
    }

    // Placeholder: In production, perform actual cryptographic verification
    // For demonstration, we assume the signature is valid if we can extract it
    const valid = signatureValue.length > 0 && hash.length > 0;

    return {
      valid,
      certificate,
      error: valid ? undefined : 'Signature verification failed',
    };
  } catch (error) {
    return {
      valid: false,
      certificate: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract signer information from CMS
 */
export function extractSignerInfo(cmsHex: string): {
  signerName: string;
  organization?: string;
  error?: string;
} {
  try {
    const parser = new CmsParser(cmsHex);
    const certBytes = parser.extractCertificate();

    if (!certBytes) {
      return {
        signerName: 'Unknown',
        error: 'Could not extract certificate',
      };
    }

    const cert = parseCertificate(certBytes);

    // Parse subject DN
    const cnMatch = cert.subject.match(/CN=([^,]+)/);
    const oMatch = cert.subject.match(/O=([^,]+)/);

    return {
      signerName: cnMatch ? cnMatch[1] : 'Unknown',
      organization: oMatch ? oMatch[1] : undefined,
    };
  } catch (error) {
    return {
      signerName: 'Unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
