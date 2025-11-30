# EU Trusted List Integration

## Overview

SignInspector uses a **static snapshot** of the EU Trusted List (EUTL) for offline trust verification. This provides privacy-preserving validation without sending certificate data to external servers.

## How It Works

### 1. Trust List Generation (Automated)

A Python script (`scripts/generate_eutl_json.py`) downloads the official EU Trusted List XML and extracts:
- Qualified Trust Service Providers (QTSPs)
- Certificate issuer information
- Provider country, name, and status

The script runs automatically via GitHub Actions:
- **Schedule**: Weekly on Sundays at 03:00 UTC
- **Trigger**: Manual workflow dispatch
- **Output**: `static/trust/eutl-providers.json`

### 2. Client-Side Lookup

When validating signatures:
1. Trust list JSON is loaded from static file (cached in browser)
2. Certificate issuer DN is normalized and matched against the list
3. Results show if issuer is in the EU Trusted List snapshot

### 3. Privacy & Security

**What this approach provides:**
- ✅ Offline validation (no network requests with PDF data)
- ✅ Fast lookup (pre-processed JSON)
- ✅ Privacy-preserving (all validation client-side)
- ✅ Transparency (trust list version and date shown)

**What this approach does NOT provide:**
- ❌ Real-time revocation checking (OCSP/CRL)
- ❌ Certificate chain validation
- ❌ Legal qualified status verification
- ❌ Timestamping validation

## Trust List Structure

```json
{
  "version": "eutl-2025-11-30",
  "generatedAt": "2025-11-30T03:00:00.000Z",
  "source": "https://ec.europa.eu/tools/lotl/eu-lotl.xml",
  "providerCount": 1234,
  "providers": [
    {
      "id": "CC:Provider Name",
      "country": "CZ",
      "name": "Bankovní identita, a.s.",
      "serviceType": "QC",
      "status": "granted",
      "issuerDn": "CN=..., O=..., C=CZ",
      "issuerDnCanonical": "cn=..., o=..., c=cz",
      "subjectKeyIdHex": "ABC123..."
    }
  ]
}
```

## Matching Strategy

1. **Primary**: Match by Subject Key Identifier (SKI) - most reliable
2. **Fallback**: Match by normalized issuer Distinguished Name (DN)

DN normalization ensures consistent matching:
- Lowercase all text
- Normalize whitespace
- Standardize attribute names (emailAddress → E)

## Usage

### Manual Trust List Generation

```bash
# Install Python (no additional dependencies needed)
python scripts/generate_eutl_json.py

# Output: static/trust/eutl-providers.json
```

### Development

A placeholder trust list is included for development with Czech providers (BankID, PostSignum).

For production, the GitHub Actions workflow automatically updates the trust list weekly.

## API

### Loading Trust List

```typescript
import { loadEUTrustList, getTrustListMetadata } from './trust';

// Load trust list (cached after first call)
const trustList = await loadEUTrustList();

// Get metadata without loading full list
const metadata = await getTrustListMetadata();
console.log(`Trust list version: ${metadata?.version}`);
```

### Looking Up Certificates

```typescript
import { lookupTrust } from './trust';
import type { CertificateInfo } from './types';

const cert: CertificateInfo = { /* ... */ };
const result = await lookupTrust(cert);

if (result.found) {
  console.log(`Found in EU Trust List:`);
  console.log(`  Provider: ${result.provider.name}`);
  console.log(`  Country: ${result.provider.country}`);
  console.log(`  Status: ${result.provider.status}`);
} else {
  console.log('Not found in EU Trust List snapshot');
}
```

### Validator Integration

The validator automatically:
1. Preloads trust list in background
2. Looks up each signature's issuer
3. Attaches `euTrustList` field to `SignatureInfo`

```typescript
interface SignatureInfo {
  // ... other fields
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
```

## Limitations & Disclaimers

### This is NOT Legal Validation

The EU Trust List lookup is **informational only**. It does not:
- Verify qualified signature status
- Check certificate revocation
- Validate certificate chains
- Provide legal non-repudiation

### Snapshot Nature

The trust list is a **point-in-time snapshot**. Between updates:
- New providers may not be included
- Status changes may not be reflected
- Revoked providers may still appear

**Always show the snapshot version and date to users.**

### Use Cases

**Appropriate:**
- "This certificate issuer is in the EU Trusted List as of [date]"
- "This provider offers qualified certificate services in [country]"
- Informational transparency for users

**Inappropriate:**
- "This is a legally qualified electronic signature"
- "This signature has legal effect"
- Legal compliance claims without full validation chain

## References

- [EU Trusted Lists Portal](https://digital-strategy.ec.europa.eu/en/policies/eu-trusted-lists)
- [ETSI TS 119 612 - TrustServiceStatusList Structure](https://www.etsi.org/deliver/etsi_ts/119600_119699/119612/)
- [eIDAS Regulation](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014R0910)

## Deployment

### Vercel Setup

1. Connect repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Trust list updates from GitHub Actions will auto-deploy

### Environment Variables

None required - trust list is static JSON file.

---

**Note**: This implementation prioritizes user privacy and transparency over real-time validation. For production eIDAS compliance, consider integrating with a Digital Signature Service (DSS) backend.
