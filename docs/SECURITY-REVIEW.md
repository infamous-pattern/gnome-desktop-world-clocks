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
5. Full GNOME 49 and 51 image/runtime checks, native-library fuzzing, continuous security scanning, and a third-party review remain outstanding. No continuous scanner has been enabled by this one-time review.

## Reproduce the automated scans

From the repository, with npm and Gitleaks installed:

```sh
npm audit --package-lock-only --json
gjs -m tests/security.js
gitleaks git . --redact --no-banner --report-format json --report-path /tmp/world-clocks-gitleaks.json
```

The first command sends dependency names/versions to the configured npm audit registry, not the extension source. Gitleaks scans locally. See the [npm audit documentation](https://docs.npmjs.com/cli/v11/commands/npm-audit/) and the [Gitleaks release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).

Reviewed ZIP SHA-256: `5870bf7439de8bbb7f540450f8b84ef751e84d5b343434bcd27f25d62e513738`.

## Hardening follow-up — submission preparation

The subsequent submission-preparation change adds a 32,768-character limit before JSON parsing, rejects path-like time-zone identifiers, limits the font string used by Shell, and restricts Shell background paths to managed image names. Preferences reject non-local/non-regular input and perform bounded reads (10 MB plus one overflow-detection byte) before decoding an immutable snapshot. PNG/JPEG/WebP signatures are checked. The package uses an exact runtime-file allowlist.

Validation: 27 adversarial input checks, seven native image rejection/cancellation checks, the 25 model checks, lint, and the GNOME 50.4 isolated desktop/preferences suite pass. The old ZIP hash and original scan records above describe the earlier implementation, not this revised ZIP. Rerun dependency and secret scans for the final release. Internal native-decoder memory/CPU limits, independent review, and full 49/51 runtime validation remain outside the completed checks; no pre-decode pixel budget or decoder sandbox is claimed.

Cross-version follow-up: model/security checks and the core Shell/preferences suite also passed on GNOME 49.9 and 51.beta in isolated containers. Image tests were explicitly excluded there because of nested image-sandbox restrictions; see [development notes](DEVELOPMENT.md).

Submission-preparation scans were rerun: npm reported zero known vulnerabilities and Gitleaks found no secrets in the revised working tree. Their JSON output is in `docs/security/2026-09-04/submission-preparation-*.json`; the new ZIP/source checksums and test scope are recorded in [submission-validation.json](submission-validation.json).

## Four-group follow-up (2026-09-04)

Group count is schema-restricted to 1–4 and clamped by the Shell manager. The group-settings helper rejects invalid indices before settings access. The existing ten-clock cap applies independently, bounding total clock records at 40. Child settings use fixed child names under the existing namespace; user input cannot select arbitrary settings paths. Group 1 keeps its original keys/path.

Preferences cancel group-specific file/image operations when switching groups, release old settings bindings, and save each group's image to its own generated managed file. Replacing an image preserves a managed file referenced by another saved group, including hidden groups. Native tests cover independent image copies, cancelled imports, and preservation of Group 1's image.

The manager owns one timer and one sleep subscription and destroys all group actors and signals on disable. Forty-clock lifecycle and mixed-refresh tests pass on GNOME 50.4 and in the 49.9/51.beta core environments. There are no new network, subprocess, or privileged operations.

Checks on this build: 33 adversarial input checks, zero known npm dependency vulnerabilities, and zero Gitleaks directory findings. These are targeted checks, not an independent security audit.

## Physical/runtime follow-up (2026-09-08)

Physical acceptance passed on the available single-monitor GNOME 50.4 desktop, including the time-status controls and settings persistence. A short whole-Shell resource observation found no measurable incremental CPU cost, approximately 1.8 MiB of memory difference after re-enabling the current eight-clock configuration, and zero extension errors. This is not a precise per-extension benchmark.

The time-settings launcher was updated from the compatibility-warning path to `GioUnix.DesktopAppInfo`. An unsupported St background-position declaration was removed, and the isolated harness now rejects its exact invalid-length warning. These changes introduce no new network, file, subprocess, or privileged operations. Lint, 25 model checks, 33 adversarial checks, the full GNOME 50.4 suite, and current-build GNOME 49.9/51.beta core suites pass.
