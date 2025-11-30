/**
 * EU Trusted List (EUTL) Trust Lookup
 *
 * Client-side trust verification against a static snapshot of the EU Trusted List.
 * This provides offline validation without sending certificate data to servers.
 *
 * Note: This is a snapshot-based approach for privacy. It does NOT provide:
 * - Real-time revocation checking (OCSP/CRL)
 * - Legal qualified status verification
 * - Certificate chain validation
 *
 * Use case: Show users if a certificate issuer is in the EU Trusted List snapshot.
 */

import type { CertificateInfo } from '../types';

/**
 * EU Trust List Provider entry
 */
export interface EUTrustProvider {
  id: string;
  country: string;
  name: string;
  serviceType: string;
  status: 'granted' | 'withdrawn' | 'revoked' | 'unknown';
  issuerDnPattern?: string;
  issuerDnCanonical: string;
  subjectKeyIdHex?: string | null;
}

/**
 * EU Trust List snapshot structure
 */
export interface EUTrustList {
  version: string;
  generatedAt: string;
  source: string;
  providerCount: number;
  providers: EUTrustProvider[];
}

/**
 * Trust lookup result
 */
export interface TrustLookupResult {
  found: boolean;
  provider?: {
    name: string;
    country: string;
    serviceType: string;
    status: string;
  };
  matchedBy?: 'ski' | 'dn';
  listVersion?: string;
  listDate?: string;
}

// Cached trust list
let cachedTrustList: EUTrustList | null = null;
let loadPromise: Promise<EUTrustList> | null = null;

/**
 * Normalize Distinguished Name for matching
 *
 * Applies same normalization as the generator script:
 * - Lowercase
 * - Trim and collapse whitespace
 * - Normalize attribute names
 */
function normalizeDN(dn: string): string {
  if (!dn) return '';

  // Lowercase and collapse whitespace
  let normalized = dn.trim().toLowerCase().replace(/\s+/g, ' ');

  // Normalize common attribute name variations
  normalized = normalized
    .replace(/emailaddress=/g, 'e=')
    .replace(/email=/g, 'e=');

  return normalized;
}

/**
 * Extract Subject Key Identifier from certificate (if available)
 */
function extractSKI(_cert: CertificateInfo): string | null {
  // PKI.js should populate this in extensions, but our current implementation
  // doesn't extract it yet. This is a placeholder for future enhancement.

  // TODO: Extract SKI from certificate extensions
  // For now, return null to rely on DN matching
  return null;
}

/**
 * Load EU Trust List from static JSON file
 *
 * Returns cached list if already loaded.
 */
export async function loadEUTrustList(): Promise<EUTrustList> {
  // Return cached list if available
  if (cachedTrustList) {
    return cachedTrustList;
  }

  // Return in-flight request if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = (async () => {
    try {
      const response = await fetch('/trust/eutl-providers.json');

      if (!response.ok) {
        throw new Error(`Failed to load trust list: ${response.status}`);
      }

      const trustList: EUTrustList = await response.json();

      console.log(`Loaded EU Trust List: ${trustList.version} (${trustList.providerCount} providers)`);

      cachedTrustList = trustList;
      return trustList;
    } catch (error) {
      console.error('Error loading EU Trust List:', error);
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Lookup certificate issuer in EU Trust List
 *
 * Strategy:
 * 1. Try to match by Subject Key Identifier (SKI) - most reliable
 * 2. Fall back to matching by canonical issuer DN
 *
 * @param cert Certificate information from signature
 * @returns Trust lookup result with provider info if found
 */
export async function lookupTrust(cert: CertificateInfo): Promise<TrustLookupResult> {
  try {
    // Load trust list
    const trustList = await loadEUTrustList();

    // Extract SKI if available
    const ski = extractSKI(cert);

    // Normalize issuer DN for matching
    const issuerDnCanonical = normalizeDN(cert.issuer);

    // Try SKI match first (most reliable)
    if (ski) {
      const skiMatch = trustList.providers.find(
        provider => provider.subjectKeyIdHex?.toLowerCase() === ski.toLowerCase()
      );

      if (skiMatch) {
        return {
          found: true,
          matchedBy: 'ski',
          provider: {
            name: skiMatch.name,
            country: skiMatch.country,
            serviceType: skiMatch.serviceType,
            status: skiMatch.status,
          },
          listVersion: trustList.version,
          listDate: trustList.generatedAt,
        };
      }
    }

    // Try DN pattern match
    // Check if any pattern from the trust list appears in the certificate issuer DN
    const patternMatch = trustList.providers.find(provider => {
      const pattern = provider.issuerDnCanonical;
      return issuerDnCanonical.includes(pattern);
    });

    if (patternMatch) {
      return {
        found: true,
        matchedBy: 'dn',
        provider: {
          name: patternMatch.name,
          country: patternMatch.country,
          serviceType: patternMatch.serviceType,
          status: patternMatch.status,
        },
        listVersion: trustList.version,
        listDate: trustList.generatedAt,
      };
    }

    // Not found in trust list
    return {
      found: false,
      listVersion: trustList.version,
      listDate: trustList.generatedAt,
    };

  } catch (error) {
    console.error('Trust lookup error:', error);

    // Return not found if trust list unavailable
    return {
      found: false,
    };
  }
}

/**
 * Check if trust list is loaded
 */
export function isTrustListLoaded(): boolean {
  return cachedTrustList !== null;
}

/**
 * Get trust list metadata (version, date) without loading full list
 */
export async function getTrustListMetadata(): Promise<{
  version: string;
  generatedAt: string;
  providerCount: number;
} | null> {
  try {
    const trustList = await loadEUTrustList();
    return {
      version: trustList.version,
      generatedAt: trustList.generatedAt,
      providerCount: trustList.providerCount,
    };
  } catch {
    return null;
  }
}
