# GNOME submission preparation

Reviewed against the current [EGO review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html) and [best practices](https://gjs.guide/extensions/review-guidelines/best-practices.html) on 2026-09-04.

**Status: submitted to extensions.gnome.org as Version 1 and awaiting review.** This document records our checks and submission status, not approval by GNOME reviewers.

## Remaining steps

1. **Maintainer review — complete.** The owner reviewed the final runtime source in four blocks, confirmed that they understand it and can maintain the JavaScript, and manually removed the three AI-notice comment lines from all ten runtime JavaScript files. No build step stripped or concealed them.
2. **Public support access — complete.** The metadata URL points to the public GitHub repository, with Issues enabled. A final Gitleaks 8.30.1 scan found no secrets across all 19 commits before visibility changed.
3. **Version validation.** Version 1 was submitted with the requested 49/50/51 targets. GNOME 50.4 passed the full isolated automated suite; GNOME 49.9 and 51.beta passed the core suite in containers, excluding images/screenshots due to nested decoder sandbox restrictions. Complete the remaining 49 and 51 checks when those environments are available and upload a follow-up if they expose a compatibility issue.
4. **Desktop acceptance.** Clock controls, backgrounds, group independence, lock/unlock, suspend/resume, Overview, full-screen behavior, display scaling, time-status controls, and settings persistence across login have passed on the owner's physical GNOME desktop. A short whole-Shell enabled/disabled observation found no measurable incremental CPU cost and about 1.8 MiB of memory difference after re-enabling the current eight-clock configuration. The available system has one monitor, so a multi-monitor arrangement was not available for physical testing. These are release-quality observations, not a claim that EGO tests every behavior or a precise per-extension resource benchmark.
5. **Build, inspect, and submit — complete.** The validated 14-file ZIP was uploaded on 2026-09-09. GNOME assigned Extension ID 10916, Review ID 74893, and Version 1 for Shell 49, 50, and 51. The approved four-group desktop image is published as the extension screenshot. The status is Unreviewed; monitor email and the review page for the reviewer decision or requested changes.

## Rule-to-evidence review

PASS means supported by source inspection or the stated tests; it is not a guarantee of reviewer acceptance. N/A means the feature is absent from the submitted runtime.

| Area | Result | Evidence |
| --- | --- | --- |
| Initialization | PASS | `extension.js` has no constructor or module-scope GObjects; manager and controller creation starts in `enable()`. |
| Object lifetime | PASS | Controller destroys its actor tree and releases clock/settings references. Five disable/enable cycles pass. |
| Signals | PASS | Controllers disconnect group signals; the manager disconnects shared signals and its single login1 subscription on disable. |
| Main-loop sources | PASS | One owned timer; removed synchronously before replacement and on disable. |
| Deprecated modules | PASS | No ByteArray, Lang, or Mainloop imports. |
| Shell/GTK separation | PASS | Shell imports remain in `shell/`; GTK/image preferences imports remain in `prefs/`; shared code imports GLib only. |
| Other extensions | PASS | Runtime does not read, enable, disable, or modify other extensions. Test-only extension-manager calls are excluded from ZIP. |
| Readable code | PASS | Unminified ES modules; lint and package checks enforce the 200-character line limit. |
| Logging | PASS | No clock-tick logging; exceptional managed-image cleanup failure is reported once per operation. |
| Resource ownership | PASS | One timer serves every visible group; empty groups keep no timer. A physical enabled/disabled observation found no measurable incremental CPU cost, about 1.8 MiB whole-Shell memory difference after re-enabling, and no extension errors. |
| GObject disposal | N/A | No `run_dispose()`. |
| External scripts/binaries | PASS | No executable or library bundled. Development Python/Node tools excluded. Compiled schema is data and the XML is also included. |
| Clipboard | N/A | No clipboard access or shortcuts. |
| Privileged processes | N/A | No root commands, pkexec helper, or privileged writes. |
| Functionality | PARTIAL | GNOME 50.4 full suite and 49.9/51.beta core suites pass; their image tests and physical-session scenarios remain pending. |
| AI provenance/maintainership | PASS | Owner reviewed the runtime source, accepted maintenance responsibility, and manually removed the AI notices. |
| Metadata | PASS | Valid UUID/schema, concise description, no version/session-mode/donation keys, and a public repository URL with Issues enabled. |
| Version declarations | PARTIAL | Version 1 declares 49, 50, and 51; full GNOME 50.4 and core 49.9/51.beta suites pass, while the remaining image and physical-session matrix is incomplete. Recheck against the final GNOME 51 release before a future update. |
| Session modes | PASS | Default user mode only; no lock-screen operation requested or selective-disable path. |
| Settings schema | PASS | Namespaced ID/path, correctly named XML, strict compilation, XML included in ZIP. |
| Telemetry | N/A | No tracking, uploads, or direct network client. |
| Conduct/political content | PASS | Inspected runtime names, descriptions, labels, and generated review screenshot; no political messaging or abusive content. |
| License/attribution | PASS | GPL-2.0-or-later source headers and license text included. No code copied from another extension was identified. |
| Artwork | PASS for ZIP | No bundled logos, wallpapers, fonts, or images. New review screenshot uses a plain-color desktop; historic prototype/screenshots must not be mistaken for licensed bundled assets. |
| Minimal archive | PASS | Explicit allowlist of 14 runtime files; no mocks, reports, tests, installers, caches, or npm packages. |
| Native UI | PASS | GTK/libadwaita controls and native font, color, and file choosers. GNOME 50's platform-specific application launcher uses `GioUnix.DesktopAppInfo`. |

A catalog search for the proposed name returned no exact match in the top results. This is a preliminary name check, not a reservation or an exhaustive trademark search. Recheck the name during upload.

## Four-group architecture

The root schema inherits the shared group keys and retains its original fixed settings path, preserving Group 1 without migration. Three child schemas inherit the same keys with separate paths and default corners. `group-count` is restricted to 1–4; `shared/groups.js` rejects invalid group indices before settings lookup. There are at most 40 cached clock records, one timer, and one login1 subscription. Changing group count does not rebuild surviving groups.

## Maintainer walkthrough

Start with `extension.js`: `enable()` constructs one `ClockManager`; `disable()` synchronously cleans it up. `shell/manager.js` owns up to four controllers, one shared timer, and shared monitor/Overview/sleep signals. Follow the controller's `_configure()` for group settings and actor creation, `_update()` for formatting, and `_syncVisibility()` for desktop visibility. Timer ownership resides in the manager's `_schedule()`/`_stopTimer()`. The private `_backgroundGroup` integration is the main API coupling to recheck for each Shell version.

`shared/model.js` validates clock settings before use, caps the raw JSON string at 32,768 characters, limits records to ten per group, and truncates descriptions to 60 characters. Time-zone identifiers cannot be filesystem paths. Formatting delegates DST and offsets to GLib. CSS text is quoted/escaped; colors accept only six-digit hex values. Shell image paths must match the managed directory and generated filename format. These are resilience measures, not a sandbox against other programs running as the same user.

`prefs.js` opens the separate preferences process. `prefs/window.js` owns its settings signal and cancellables; edits are saved only if the clock-list snapshot still matches. `prefs/zones.js` reads the installed zone database. `prefs/images.js` rejects non-local/non-regular input, reads at most 10 MB plus one overflow-detection byte, checks raster signatures, and asynchronously decodes the bounded snapshot to a maximum 2048-pixel output. Preferences cancel pending image selection/import on group changes, unbind old group controls, and preserve settings when groups are hidden. Preferences save a managed copy and remove only its prior managed image when no other group references it. Original files remain untouched.

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

The last command creates `dist/submission/desktop-world-clocks@infamous-pattern.github.io.shell-extension.zip` and still rejects any runtime source containing the AI notice. It validates archive inputs but cannot certify public support access or the full runtime matrix.

Rerun a secret scan of all repository history before making the project public. Keep the generated development and submission archives separate. GNOME assigns the extension's version; do not add an upload version number to `metadata.json`.
