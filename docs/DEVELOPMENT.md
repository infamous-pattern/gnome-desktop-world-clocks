# Development and validation

## Structure

- `extension.js`: enable/disable entry point; no objects or signal connections at module scope.
- `shell/controller.js`: owns the desktop actors, bounded zone cache, visibility, positioning, and single update source.
- `prefs.js`, `prefs/window.js`, `prefs/zones.js`: separate GTK/libadwaita process; native font/color/file choosers, cancellable database/image/status reads, and GSettings edits.
- `shared/model.js`: formatting, date comparisons, input normalization, and scheduling arithmetic. Imports GLib only.
- `schemas/`: persistent clock and appearance settings.
- `scripts/package.py`: compiles the schema strictly and archives runtime files only. No browser prototype, npm dependencies, tests, or build tools are shipped.

The only private Shell integration is adding one actor to `Main.layoutManager._backgroundGroup`. This places it above the wallpaper and below application windows. GNOME has no stable extension API for a desktop overlay. That ownership/layering was source-reviewed in upstream `js/ui/layout.js` at tags **49.0, 50.4, and 51.rc**; it must still be checked on every supported Shell release. The extension does not modify Shell methods or manipulate individual wallpaper actors.

## Checks completed on 2026-09-04

Environment: Fedora 44, GNOME Shell/Mutter 50.4, GTK 4.22, libadwaita 1.9. Isolated virtual 1280 × 720 Wayland monitor and software rendering.

- ESLint: undefined names, unused variables, unreachable code, duplicate keys, strict equality, and line-length checks.
- Strict GSettings schema compilation and runtime-only ZIP packaging.
- 25 GLib model checks: US/UK DST boundaries, fractional offsets including Nepal and Chatham, calendar-year day differences, custom/default descriptions, color validation, abbreviation switches, record limits, and boundary scheduling.
- Read the installed time-zone database, including 598 identifiers/aliases on this system. The count is environment-dependent, not hard-coded.
- Load the installed ZIP in a real isolated GNOME Shell. Exercise all five layouts, global/per-clock styling, background/text opacity separation, optional seconds, widget reuse, Overview pause/resume, compact right placement, ten large clocks fitting the monitor, and zero timers for an empty list.
- Five repeated enable/disable cycles: verify timer sources removed, external signal list cleared, actors/settings released, and only one clock surface after re-enabling.
- Native preferences: system zone list, font and color widgets, blank-description fallback, individual abbreviation setting, saved clock records, bounded local image preparation, unique replacement image URI, and previous-copy cleanup.
- Capture and visually inspect the native desktop and preferences window. Screenshots are examples, not performance benchmarks.

The test session emits some host portal/service warnings because it has no PipeWire server, document-portal FUSE mount, or session systemd manager. These are isolated-session limitations. No extension JavaScript error is accepted as a passing result.

## Running tests

Use Node.js 22.13+ for ESLint 10; the lockfile pins dependencies. `npm test` uses the actual GJS/GLib runtime and a memory-backed settings object. It does not depend on Node for clock calculations.

`python3 scripts/test-shell.py` requires a Linux GNOME installation with `gnome-shell`, `gjs`, `dbus-run-session`, and software-rendering support. It uses the compositor's built-in automation-script interface. The preferences harness registers the installed Shell resources and includes the standard Fedora/Debian Shell typelib locations. Other distributions may need a `GI_TYPELIB_PATH` adjustment. Results and screenshots are written to ignored `test-results/`; the temporary installed extension/settings/data are removed after the run.

## Remaining release gates

GNOME 49 and 51 runtime testing is **pending**. Run the same tests on those releases before upgrading their status to verified; test a final GNOME 51 build when available. Declaring versions in metadata is not proof of compatibility.

On physical desktops, verify suspend/resume, lock/unlock, full-screen applications, monitor hotplug, multiple-monitor selection, fractional/HiDPI scaling, desktop-icon extensions, wallpaper changes, and image selection through the file portal. Confirm the operating system's actual time status independently. The isolated tests cover Overview and timer ownership, but do not establish these hardware/session behaviors or real NTP accuracy.

Measure idle CPU, wakeups, and incremental Shell memory with 0/1/10 clocks, seconds off/on, and backgrounds disabled/enabled. Include a repeated-settings and enable/disable soak test. No numerical resource budget has been claimed without those measurements.

## Guide review

Reviewed against the [extension guide](https://gjs.guide/extensions/), [review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html), [best practices](https://gjs.guide/extensions/review-guidelines/best-practices.html), and porting notes for [49](https://gjs.guide/extensions/upgrading/gnome-shell-49.html), [50](https://gjs.guide/extensions/upgrading/gnome-shell-50.html), and [51](https://gjs.guide/extensions/upgrading/gnome-shell-51.html).

Cleanup is synchronous, including for GNOME 51. There are no removed backend/GLSL APIs, legacy `imports` in the extension, GTK imports in Shell code, Shell imports in preferences, root commands, network clients, or permanent background processes. Runtime strings use gettext, but translated catalogs have not yet been supplied.
