#!/usr/bin/env python3
"""
EU Trusted List (EUTL) JSON Generator

Generates a JSON file with known European Qualified Trust Service Providers
for client-side trust validation. This uses a curated list of major QTSPs
rather than parsing the complex EU LOTL structure.

For production use, consider integrating with the EU DSS or a dedicated
trust list management service.

Usage:
    python scripts/generate_eutl_json.py

Output:
    static/trust/eutl-providers.json

References:
- EU Trusted Lists: https://digital-strategy.ec.europa.eu/en/policies/eu-trusted-lists
- ETSI TS 119 612: Structure of TrustServiceStatusList
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict

# Curated list of major European Qualified Trust Service Providers
# This list includes well-known QTSPs that issue qualified certificates
# Sources: EU Trusted Lists, national trust service databases
KNOWN_QTSP_PROVIDERS = [
    # Czech Republic
    {
        'country': 'CZ',
        'name': 'Bankovní identita, a.s.',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'bankovní identita',  # With diacritics
            'bankovni identita',  # Without diacritics (common in DNs)
            'bank id',
            'bankid',
        ],
    },
    {
        'country': 'CZ',
        'name': 'PostSignum',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'postsignum',
            'česká pošta',
            'ceska posta',
        ],
    },
    {
        'country': 'CZ',
        'name': 'I.CA',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'i.ca',
            'první certifikační',
            'prvni certifikacni',
        ],
    },
    {
        'country': 'CZ',
        'name': 'eIdentity',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'eidentity',
            'elektronická identita',
            'elektronicka identita',
        ],
    },

    # Belgium
    {
        'country': 'BE',
        'name': 'Certipost',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=certipost',
            'o=certipost',
        ],
    },
    {
        'country': 'BE',
        'name': 'GlobalSign',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=globalsign',
            'o=globalsign',
        ],
    },

    # Germany
    {
        'country': 'DE',
        'name': 'D-TRUST',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=d-trust',
            'o=d-trust',
            'o=bundesdruckerei',
        ],
    },
    {
        'country': 'DE',
        'name': 'T-Systems',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=telesec',
            'o=t-systems',
        ],
    },

    # Spain
    {
        'country': 'ES',
        'name': 'FNMT-RCM',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=fnmt',
            'o=fnmt',
            'ou=ceres',
        ],
    },
    {
        'country': 'ES',
        'name': 'AC Camerfirma',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=camerfirma',
            'o=camerfirma',
        ],
    },

    # France
    {
        'country': 'FR',
        'name': 'ChamberSign',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=chambersign',
            'o=chambersign',
        ],
    },
    {
        'country': 'FR',
        'name': 'Certinomis',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=certinomis',
            'o=certinomis',
        ],
    },

    # Italy
    {
        'country': 'IT',
        'name': 'InfoCert',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=infocert',
            'o=infocert',
        ],
    },
    {
        'country': 'IT',
        'name': 'Aruba PEC',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=aruba',
            'o=aruba',
        ],
    },

    # Netherlands
    {
        'country': 'NL',
        'name': 'KPN',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=kpn',
            'o=kpn',
        ],
    },
    {
        'country': 'NL',
        'name': 'QuoVadis',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=quovadis',
            'o=quovadis',
        ],
    },

    # Switzerland (EEA associated)
    {
        'country': 'CH',
        'name': 'SwissSign',
        'serviceType': 'QCertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=swisssign',
            'o=swisssign',
        ],
    },

    # International (operating in EU)
    {
        'country': 'EU',
        'name': 'DigiCert',
        'serviceType': 'CertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=digicert',
            'o=digicert',
        ],
    },
    {
        'country': 'EU',
        'name': 'Thawte',
        'serviceType': 'CertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=thawte',
            'o=thawte',
        ],
    },
    {
        'country': 'EU',
        'name': 'Entrust',
        'serviceType': 'CertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=entrust',
            'o=entrust',
        ],
    },
    {
        'country': 'EU',
        'name': 'Sectigo',
        'serviceType': 'CertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=sectigo',
            'o=sectigo',
            'cn=comodo',
            'o=comodo',
        ],
    },
    {
        'country': 'EU',
        'name': 'IdenTrust',
        'serviceType': 'CertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=identrust',
            'o=identrust',
        ],
    },
    {
        'country': 'EU',
        'name': 'GoDaddy',
        'serviceType': 'CertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=godaddy',
            'o=godaddy',
        ],
    },
    {
        'country': 'EU',
        'name': 'SSL.com',
        'serviceType': 'CertESig',
        'status': 'granted',
        'issuerDnPatterns': [
            'cn=ssl.com',
            'o=ssl.com',
        ],
    },
]


def generate_trust_list():
    """
    Generate trust list JSON from curated QTSP data.

    Note: This uses a curated list of known QTSPs rather than parsing
    the complex EU LOTL structure. For production, consider integrating
    with official trust list management services.
    """
    print("Generating EU Trust List from curated QTSP data...", file=sys.stderr)

    providers = []

    for qtsp in KNOWN_QTSP_PROVIDERS:
        # Create provider entry for each DN pattern
        for pattern in qtsp['issuerDnPatterns']:
            provider_entry = {
                'id': f"{qtsp['country']}:{qtsp['name']}",
                'country': qtsp['country'],
                'name': qtsp['name'],
                'serviceType': qtsp['serviceType'],
                'status': qtsp['status'],
                'issuerDnPattern': pattern,
                'issuerDnCanonical': pattern.lower().strip(),
                'subjectKeyIdHex': None,
            }
            providers.append(provider_entry)

    print(f"Generated {len(providers)} provider patterns from {len(KNOWN_QTSP_PROVIDERS)} QTSPs", file=sys.stderr)

    # Generate output structure
    output = {
        'version': f"qtsp-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'source': 'Curated list of European QTSPs',
        'note': 'This is a curated list of major European Qualified Trust Service Providers. For comprehensive validation, integrate with official EU trust list services.',
        'providerCount': len(providers),
        'providers': providers,
    }

    # Write to file
    output_path = Path(__file__).parent.parent / 'static' / 'trust' / 'eutl-providers.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Generated {output_path}", file=sys.stderr)
    print(f"   Version: {output['version']}", file=sys.stderr)
    print(f"   Providers: {output['providerCount']}", file=sys.stderr)
    print(f"   QTSPs: {len(KNOWN_QTSP_PROVIDERS)}", file=sys.stderr)
    print(f"   Generated: {output['generatedAt']}", file=sys.stderr)


if __name__ == '__main__':
    generate_trust_list()
