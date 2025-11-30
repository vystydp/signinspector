/**
 * Type extensions for PKI.js library
 * These types are not fully exported by PKI.js but are used in practice
 */

import type * as asn1js from 'asn1js';

/**
 * Extended type for public key values that may include named curves
 */
export interface ECPublicKeyValue {
  namedCurve?: string;
  x?: asn1js.Integer;
  y?: asn1js.Integer;
}

export interface RSAPublicKeyValue {
  modulus: asn1js.Integer;
  publicExponent: asn1js.Integer;
}

/**
 * Extended types for ASN.1 time values with toDate method
 */
export interface ASN1TimeValue {
  toDate(): Date;
  valueBlock: {
    value?: unknown[];
    valueHex?: ArrayBuffer;
  };
}

/**
 * Type guard for EC public keys
 */
export function isECPublicKey(key: unknown): key is ECPublicKeyValue {
  return (
    typeof key === 'object' &&
    key !== null &&
    'namedCurve' in key
  );
}

/**
 * Type guard for RSA public keys
 */
export function isRSAPublicKey(key: unknown): key is RSAPublicKeyValue {
  return (
    typeof key === 'object' &&
    key !== null &&
    'modulus' in key
  );
}

/**
 * Type guard for ASN.1 time values
 */
export function isASN1TimeValue(value: unknown): value is ASN1TimeValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as ASN1TimeValue).toDate === 'function'
  );
}
