# Security Policy

## Reporting a Vulnerability
If you discover a security vulnerability in **Vim-For-Docs**, please report it privately via [GitHub Security Advisories](https://github.com/greenstorm5417/Vim-For-Docs/security/advisories).

Please **do not** post security vulnerabilities in public issues.

## Data Handling and Privacy
- **Vim-For-Docs** does not collect or transmit any user data externally.
- The extension **only** stores user settings (e.g., theme, enabled/disabled state) using **Chrome Storage Sync**.
- No keystrokes, documents, or personal data are collected or sent to external servers.

## Permissions Justification
We use the following Chrome extension permissions:
- **storage**: Saves user preferences (enabled state, theme selection, etc.).
- **scripting**: Injects Vim-like behavior scripts into Google Docs.
- **activeTab**: Ensures scripts are only injected when needed.

The extension **does not** access clipboard contents, modify external websites, or track user behavior outside of Google Docs.

## Security Best Practices
To ensure the safety of users:
- We **do not execute arbitrary code** from external sources.
- Content scripts are **sandboxed** and run within Google Docs without elevated privileges.
- User-reported vulnerabilities will be reviewed promptly and patched in updates.
