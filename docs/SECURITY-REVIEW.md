# Initial security review — 2026-09-04

Reviewed implementation commit: `5f0f5348165b11e4325d37e44fb566246fbacc45`.

**Result:** no known npm dependency vulnerabilities, no detected secrets in repository history, and no confirmed exploitable extension-code vulnerability identified in this limited review. This is an initial automated and manual review, not an independent penetration test or security certification.

## Checks performed

| Check | Result and scope |
| --- | --- |
| `npm audit --package-lock-only --json` | 0 informational, low, moderate, high, or critical findings across 77 development dependencies at scan time. The installed extension contains no npm dependencies. |
| Gitleaks 8.30.1, default rules, redacted output | All six commits reachable in the local repository scanned; no leaks detected. Official release binary checked against the publisher's SHA-256 checksum before use. |
| Targeted adversarial input checks in GJS | 16 passed: malformed JSON/records, 1,000-record truncation, long-label truncation, color injection rejection, CSS quote/control-character escaping, and preservation of labels as literal text. |
| Manual runtime source review | Reviewed Shell, preferences, shared model, metadata, schema, and packaging code for command execution, dynamic code evaluation, network access, markup/CSS injection, file reads/writes/deletion, cancellation, and lifecycle ownership. |
| Distribution inspection | ZIP contains ten expected runtime files, no development dependencies, no duplicate/path-traversal entries; every entry byte-matches the reviewed local source or compiled schema. |

The pre-existing ESLint, model tests, and isolated GNOME lifecycle tests are useful supporting checks but are not vulnerability scanners. No CodeQL, Semgrep, or independent human security audit was performed.

## Security properties confirmed by source inspection

- No runtime `eval`, dynamic function construction, shell command execution, direct network client, credentials, telemetry, or privileged helper.
- System-service interaction is a read-only time-status request and a sleep notification subscription. Opening Date & Time uses a fixed installed application identifier after a user click.
- User descriptions use text labels and preferences rows with markup disabled. Colors must be six-digit hex values; font and image strings are quoted and escaped before use in CSS.
- Image selection accepts local files and checks declared size/type; preferences prepare a bounded-size PNG before Shell displays it. There is no image upload.
- Image cleanup is restricted to the managed directory and generated filename pattern. Original selected images are not deleted.
- The desktop timer, external signals, service subscription, and actors have explicit disable cleanup. Preferences I/O is cancellable.

## Limitations and follow-up hardening

1. **Native libraries are outside npm audit's coverage.** GJS, GNOME Shell, GLib, GTK, GdkPixbuf, and their image decoders come from the operating system. Their installed packages/CVEs were not audited here; keeping the distribution updated remains necessary. GNOME extensions execute with the desktop user's privileges.
2. **Image decoding needs further hostile-file testing.** A compressed file-size limit and a 2048-pixel output limit do not prove bounded memory/CPU inside every decoder. The selected image is decoded in the preferences process, which is separate from Shell but is not a security sandbox. A pre-decode pixel budget, strict regular-file checks, bounded input reads, and malformed-image testing are follow-up hardening opportunities. No exploitable decoder flaw was demonstrated in this review.
3. **Local settings are trusted configuration, not a sandbox boundary.** Clock records are truncated after JSON parsing; exceptionally large externally written settings can still impose parsing cost. Image paths can also be changed directly by another process running as the same user. A raw-settings size limit and stricter managed-path policy would provide additional resilience. No privilege-escalation path was identified.
4. The browser prototype is not shipped. Gitleaks included its committed history, but runtime application-security review focused on the extension.
5. GNOME 49 and 51 runtime checks, native-library fuzzing, continuous security scanning, and a third-party review remain outstanding. No continuous scanner has been enabled by this one-time review.

## Reproduce the automated scans

From the repository, with npm and Gitleaks installed:

```sh
npm audit --package-lock-only --json
gjs -m tests/security.js
gitleaks git . --redact --no-banner --report-format json --report-path /tmp/world-clocks-gitleaks.json
```

The first command sends dependency names/versions to the configured npm audit registry, not the extension source. Gitleaks scans locally. See the [npm audit documentation](https://docs.npmjs.com/cli/v11/commands/npm-audit/) and the [Gitleaks release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).

Reviewed ZIP SHA-256: `5870bf7439de8bbb7f540450f8b84ef751e84d5b343434bcd27f25d62e513738`.
