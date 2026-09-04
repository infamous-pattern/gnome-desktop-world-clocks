# GNOME submission preparation

Reviewed against the current [EGO review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html) and [best practices](https://gjs.guide/extensions/review-guidelines/best-practices.html) on 2026-09-04.

**Status: technically prepared for maintainer review; not yet ready to upload.** This document records our checks, not approval by GNOME reviewers.

## Remaining steps

1. **Maintainer review.** The owner confirmed they can review and maintain the JavaScript. Read the final source and the walkthrough below, run the checks, and resolve anything you cannot explain. GNOME's maintainership guidance asks the qualified maintainer to manually remove the three AI-notice comment lines in each runtime JavaScript file after review. They remain present intentionally. No build step strips or conceals them.
2. **Public support access.** The metadata URL currently points to a private GitHub repository with Issues enabled. Before upload, make this project public or provide an accessible project/support repository and update the URL. The prepared repository contains the source, GPL license, documentation, design prototype, test screenshots, and security reports; assess all of it before changing visibility. No visibility change has been made.
3. **Version validation.** The development build retains the requested 49/50/51 targets. GNOME 50.4 passed the full isolated automated suite; GNOME 49.9 and 51.beta passed the core suite in containers, excluding images/screenshots due to nested decoder sandbox restrictions. Complete their runtime checks before claiming verified compatibility. Alternatively, explicitly decide to submit an initial build listing only 50 while retaining 49/51 as future validation targets. That decision has not been made for the owner.
4. **Desktop acceptance.** Exercise lock/unlock, suspend/resume, full-screen applications, multiple monitors, scaling, and file selection on a physical desktop. These are release-quality checks, not a claim that EGO tests every behavior. Inspect logs for extension errors.
5. **Build and inspect.** After maintainer review and any metadata changes, rerun the commands below and inspect the submission ZIP. Upload it while signed in to the owner's account at [extensions.gnome.org](https://extensions.gnome.org/). Follow the website's current upload prompts and review discussion. No upload has been performed.

## Rule-to-evidence review

PASS means supported by source inspection or the stated tests; it is not a guarantee of reviewer acceptance. N/A means the feature is absent from the submitted runtime.

| Area | Result | Evidence |
| --- | --- | --- |
| Initialization | PASS | `extension.js` has no constructor or module-scope GObjects; controller creation starts in `enable()`. |
| Object lifetime | PASS | Controller destroys its actor tree and releases clock/settings references. Five disable/enable cycles pass. |
| Signals | PASS | Controller disconnects tracked signals and its login1 subscription on disable. |
| Main-loop sources | PASS | One owned timer; removed synchronously before replacement and on disable. |
| Deprecated modules | PASS | No ByteArray, Lang, or Mainloop imports. |
| Shell/GTK separation | PASS | Shell imports remain in `shell/`; GTK/image preferences imports remain in `prefs/`; shared code imports GLib only. |
| Other extensions | PASS | Runtime does not read, enable, disable, or modify other extensions. Test-only extension-manager calls are excluded from ZIP. |
| Readable code | PASS | Unminified ES modules; lint and package checks enforce the 200-character line limit. |
| Logging | PASS | No clock-tick logging; exceptional managed-image cleanup failure is reported once per operation. |
| GObject disposal | N/A | No `run_dispose()`. |
| External scripts/binaries | PASS | No executable or library bundled. Development Python/Node tools excluded. Compiled schema is data and the XML is also included. |
| Clipboard | N/A | No clipboard access or shortcuts. |
| Privileged processes | N/A | No root commands, pkexec helper, or privileged writes. |
| Functionality | PARTIAL | GNOME 50.4 full suite and 49.9/51.beta core suites pass; their image tests and physical-session scenarios remain pending. |
| AI provenance/maintainership | PENDING | Owner accepted responsibility; manual code review and notice removal remain. |
| Metadata | PARTIAL | Valid UUID/schema, concise description, no version/session-mode/donation keys. Public URL access remains pending. |
| Version declarations | PARTIAL | 49/50 are stable and 51 is the current development series at this review date; full runtime matrix remains incomplete. Recheck current release status before upload. |
| Session modes | PASS | Default user mode only; no lock-screen operation requested or selective-disable path. |
| Settings schema | PASS | Namespaced ID/path, correctly named XML, strict compilation, XML included in ZIP. |
| Telemetry | N/A | No tracking, uploads, or direct network client. |
| Conduct/political content | PASS | Inspected runtime names, descriptions, labels, and generated review screenshot; no political messaging or abusive content. |
| License/attribution | PASS | GPL-2.0-or-later source headers and license text included. No code copied from another extension was identified. |
| Artwork | PASS for ZIP | No bundled logos, wallpapers, fonts, or images. New review screenshot uses a plain-color desktop; historic prototype/screenshots must not be mistaken for licensed bundled assets. |
| Minimal archive | PASS | Explicit allowlist of 11 runtime files; no mocks, reports, tests, installers, caches, or npm packages. |
| Native UI | PASS | GTK/libadwaita controls and native font, color, and file choosers. |

A catalog search for the proposed name returned no exact match in the top results. This is a preliminary name check, not a reservation or an exhaustive trademark search. Recheck the name during upload.

## Maintainer walkthrough

Start with `extension.js`: `enable()` constructs and starts one controller; `disable()` calls its synchronous cleanup and releases it. Follow the controller's `_configure()` for settings and actor creation, `_update()` for formatting, `_syncVisibility()` for desktop visibility, and `_schedule()`/`_stopTimer()` for timer ownership. The private `_backgroundGroup` integration is the main API coupling to recheck for each Shell version.

`shared/model.js` validates clock settings before use, caps the raw JSON string at 32,768 characters, limits records to ten, and truncates descriptions to 60 characters. Time-zone identifiers cannot be filesystem paths. Formatting delegates DST and offsets to GLib. CSS text is quoted/escaped; colors accept only six-digit hex values. Shell image paths must match the managed directory and generated filename format. These are resilience measures, not a sandbox against other programs running as the same user.

`prefs.js` opens the separate preferences process. `prefs/window.js` owns its settings signal and cancellables; edits are saved only if the clock-list snapshot still matches. `prefs/zones.js` reads the installed zone database. `prefs/images.js` rejects non-local/non-regular input, reads at most 10 MB plus one overflow-detection byte, checks raster signatures, and asynchronously decodes the bounded snapshot to a maximum 2048-pixel output. Preferences save a managed copy and remove only its prior managed image. Original files remain untouched.

The image decoder is still an operating-system library; this does not prove resistance to every malformed image or bound internal decompression memory. The compressed input cap and output dimensions are not a pre-decode pixel budget. This residual limitation is documented in the security report and merits independent review.

The Date & Time button launches a fixed installed application. Synchronization status is read from timedated; no NTP server is chosen, no privileged setup runs, and no accuracy measurement is fabricated.

## Final commands

```sh
npm ci --ignore-scripts
npm run lint
npm test
npm run test:security
npm audit --package-lock-only
python3 scripts/test-shell.py
python3 scripts/package.py --submission
```

The last command deliberately fails until the maintainer manually removes the AI notices. It then creates `dist/submission/desktop-world-clocks@infamous-pattern.github.io.shell-extension.zip`. It validates archive inputs but cannot certify that maintainer review, public support access, or the full runtime matrix are complete.

Rerun a secret scan of all repository history before making the project public. Keep the generated development and submission archives separate. GNOME assigns the extension's version; do not add an upload version number to `metadata.json`.
