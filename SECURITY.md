# Security policy

## Supported version

Security fixes are applied to the latest version on the default branch.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Email
`security@landed.jobs` with:

- the affected endpoint or component;
- reproduction steps;
- the likely impact;
- any logs or proof of concept with tokens and personal data removed.

We will acknowledge a complete report within five business days. Do not access another user's data,
degrade the hosted service, or retain secrets while testing.

## Secrets

The hosted server accepts optional Landed API tokens. Never include a real token in an issue, pull
request, screenshot, or test fixture. Repository CI runs without production credentials.
