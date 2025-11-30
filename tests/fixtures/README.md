# Test Fixtures

This directory contains test PDF files for automated testing.

## Structure

```
fixtures/
├── valid/                  # Valid signed PDFs
│   ├── bankid-signed.pdf   # BankID.cz signature
│   ├── eu-qualified.pdf    # EU qualified certificate
│   └── adobe-signed.pdf    # Adobe signature
├── modified/               # Modified after signing
│   ├── content-added.pdf   # Content added after signing
│   └── tampered.pdf        # Maliciously tampered
├── edge-cases/             # Edge cases
│   ├── multiple-sigs.pdf   # Multiple signatures
│   ├── unsigned.pdf        # No signatures
│   └── corrupted.pdf       # Corrupted file
└── algorithms/             # Different algorithms
    ├── rsa-2048.pdf        # RSA 2048-bit
    ├── ecdsa-p256.pdf      # ECDSA P-256
    └── sha1-weak.pdf       # SHA-1 (weak)
```

## Usage in Tests

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import { validatePdfBytes } from '../../src/lib/core/validation/validator';

describe('PDF Validation', () => {
  it('should validate BankID signature', async () => {
    const pdfBytes = readFileSync(
      join(__dirname, '../fixtures/valid/bankid-signed.pdf')
    );
    const result = await validatePdfBytes(new Uint8Array(pdfBytes));
    
    expect(result.overallStatus).toBe('VALID');
    expect(result.signatures[0].isBankId).toBe(true);
  });
});
```

## Adding New Fixtures

1. **Valid Signatures**: Place in `valid/` with descriptive names
2. **Modified Documents**: Place in `modified/` to test integrity detection
3. **Edge Cases**: Place in `edge-cases/` for boundary conditions
4. **Algorithm Tests**: Place in `algorithms/` to test crypto support

## Security Note

⚠️ **Do not commit sensitive documents**. All PDFs in this directory should be:
- Public or test documents only
- No personal information
- No confidential business data
- Synthetic test data preferred

## Creating Test PDFs

### BankID Test Document
1. Visit https://www.bankid.cz
2. Create test certificate
3. Sign a sample PDF
4. Verify signature
5. Place in `valid/bankid-signed.pdf`

### Modified Document Test
1. Take any valid signed PDF
2. Open in text editor
3. Modify a few bytes after signature
4. Save as `modified/tampered.pdf`

### Multiple Signatures
1. Sign PDF with first certificate
2. Open and add another signature
3. Save as `edge-cases/multiple-sigs.pdf`

## Current Status

📋 **TODO**: Add sample PDF files for each category
- [ ] valid/bankid-signed.pdf
- [ ] valid/eu-qualified.pdf
- [ ] valid/adobe-signed.pdf
- [ ] modified/content-added.pdf
- [ ] modified/tampered.pdf
- [ ] edge-cases/multiple-sigs.pdf
- [ ] edge-cases/unsigned.pdf
- [ ] algorithms/rsa-2048.pdf
- [ ] algorithms/ecdsa-p256.pdf

Sample PDFs can be obtained from:
- https://www.bankid.cz (Czech BankID)
- Adobe Acrobat sample documents
- EU digital signature test suites
- Generated with PDF signing tools
