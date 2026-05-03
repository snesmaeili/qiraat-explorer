# Security Policy

## Supported Versions

Currently, the Qira'at Explorer prototype is in its early `v0.1.x` release phase. All security patches will be applied to the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within Qira'at Explorer, please open an issue describing the problem. Since this is a client-side React prototype that relies entirely on static data, traditional server-side vulnerabilities do not generally apply.

However, if you notice an issue related to:
- Maliciously crafted data payloads triggering XSS.
- Unsafe dependency updates in `package.json`.
- Missing integrity checks causing a bypass of the Sacred Text Integrity Policy.

Please report it immediately so it can be triaged and addressed.

## Data Integrity 
Please note that discrepancies in Qur'anic text or variant attributions are considered **Data Integrity Issues**, not Security Vulnerabilities. Such issues should be reported via standard GitHub issues or through the Verification Ledger workflow outlined in `CONTRIBUTING.md`.
