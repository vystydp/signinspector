/**
 * Mapping core validation results to UI-safe statuses and messages
 * This layer translates technical validation data into user-friendly information
 */

import type { ValidationStatus, ByteIntegrityStatus, RevisionChangeType, TrustStatus } from '../types';

/**
 * Get validation status as human-readable string
 */
export function getStatusText(status: ValidationStatus): string {
  switch (status) {
    case 'VALID':
      return 'Valid';
    case 'INVALID':
      return 'Invalid';
    case 'INDETERMINATE':
      return 'Indeterminate';
    default:
      return 'Unknown';
  }
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: ValidationStatus): 'success' | 'danger' | 'warning' | 'neutral' {
  switch (status) {
    case 'VALID':
      return 'success';
    case 'INVALID':
      return 'danger';
    case 'INDETERMINATE':
      return 'warning';
    default:
      return 'neutral';
  }
}

/**
 * Get integrity status color
 */
export function getIntegrityColor(bytes: ByteIntegrityStatus, revisionChange: RevisionChangeType): 'success' | 'danger' | 'warning' {
  if (bytes === 'CHANGED') {
    return 'danger';
  }
  if (revisionChange === 'CONTENT') {
    return 'warning';
  }
  if (bytes === 'INTACT' && revisionChange === 'NONE') {
    return 'success';
  }
  return 'warning';
}

/**
 * Get trust status color
 */
export function getTrustColor(status: TrustStatus): 'success' | 'danger' | 'warning' | 'neutral' {
  switch (status) {
    case 'TRUSTED':
      return 'success';
    case 'WEAK_ALGO':
    case 'UNSUPPORTED_ALGO':
      return 'warning';
    case 'NOT_EVALUATED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Get user-friendly algorithm name
 */
export function getAlgorithmDisplayName(hashAlgo?: string, sigAlgo?: string): string {
  if (!hashAlgo && !sigAlgo) return 'Unknown';

  const parts: string[] = [];
  if (sigAlgo) parts.push(sigAlgo);
  if (hashAlgo) parts.push(`with ${hashAlgo}`);

  return parts.join(' ') || 'Unknown';
}
