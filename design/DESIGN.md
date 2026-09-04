# Design brief — approved concept and implementation decisions

## Direction

Text directly over the wallpaper, inspired by the supplied reference. The starting layout is `Description abbreviation – HH:MM`, with a light text shadow and no panel surrounding the desktop clocks. Preferences are shown beside the desktop in the historical browser preview; the implemented extension uses a separate native preferences window.

Working repository name: `gnome-desktop-world-clocks`.
User-facing name: **Desktop World Clocks**.

## Core requirements

1. Support up to ten independently selected time zones, including multiple labels for the same zone.
2. Offer the complete current system time-zone database, UTC, and recognized aliases. Persist zone identifiers, not hard-coded offsets or abbreviations.
3. Allow an optional custom description for each clock. If omitted or cleared, use the selected time zone’s city/location name (for example, `America/New_York` becomes `New York`). Automatically filled descriptions follow subsequent zone selections; user-written descriptions are preserved. The preview accepts up to 60 characters and wraps long text.
4. Provide a searchable chooser for all fonts installed and available to GNOME, plus shared font size and clock opacity (0–100%). Offer a global font color with optional per-clock color overrides. Each clock defaults to “Use global font color”; changing the global color affects only clocks that inherit it. Restoring inheritance discards that clock’s override. Opacity applies to the complete clock text, including its shadow, independently of color.
5. Derive all clock readings from one synchronized system clock. Apply each selected zone's daylight-saving and historical rule changes through the system time-zone database.
6. Use the existing system time service, as selected during implementation. Nearby pool and local/custom NTP configuration belong to that service; preferences provide truthful system status and a Date & Time handoff.
7. Offer five layouts: inline, aligned columns, stacked, two-column grid, and horizontal strip. The grid collapses when space is limited; the strip wraps as needed to keep clocks visible.
8. Provide transparent, solid-color, or user-selected image backgrounds for the clock group. Transparent is the default. Backgrounds do not change the desktop wallpaper and remain independent of text opacity. Images use centered, cover-style cropping.

9. Give each clock a “Show time zone abbreviation” option, enabled by default. The global “Enable time zone abbreviations” switch is a master control: disabling it hides all abbreviations without discarding individual choices. The local description and actual time-zone conversion remain unchanged.

## Preview interactions

- Eight starting locations match the supplied reference: Los Angeles, Austin, London, Vienna, Pune, Singapore, Japan, and Melbourne.
- Time is live device time; displayed abbreviations follow the current date, rather than copying the reference's seasonal abbreviations.
- Add, rename, change zone, remove, and reorder clocks. Show or hide each clock’s time-zone abbreviation independently, subject to the global master switch. Adding is disabled at ten.
- Searchable installed-font chooser, 14–48 px size, 0–100% clock opacity, global color and per-clock color overrides, 12/24-hour display, optional seconds, optional date difference relative to the device, and text shadow.
- Inline, aligned-column, stacked, two-column grid, and wrapping horizontal-strip layouts; four desktop corner anchors.
- Transparent, solid-color, or local-image clock backgrounds. PNG, JPG, and WebP files up to 10 MB are supported in the preview. Files stay in browser memory for the current page session and are not uploaded or committed. Switching modes retains the chosen color/image for this session.
- Source selection is only a preview preference. No network requests or system changes occur.

The embedded list contains 597 system time-zone identifiers and aliases captured on 2026-09-04. The preview filters out entries unsupported by the browser's time-zone engine. This snapshot is not a replacement for a native, dynamically enumerated system zone database. The prototype font list was refreshed from all installed font families on the development GNOME system; browsers can fall back when a requested font is unavailable.

## Synchronization design

The GNOME overlay should display the operating system clock. A system time service, such as chrony on Fedora, should synchronize that clock. NTP does not need a separate connection for each displayed time zone.

**Selected during implementation:** use the existing system service and open GNOME Date & Time for changes. No NTP client, authenticated helper, or server configuration is included in the extension. The earlier browser source-selection controls remain a historical design preview.

The extension reads the standard system synchronization status on opening preferences and on manual refresh. It does not claim a nearest server or invent server addresses, latency, offsets, or last-sync measurements. When status is unavailable, the clocks continue to display system time.

## GNOME implementation considerations

- Compatibility targets: GNOME Shell 49, 50, and 51. GNOME 50.4 has passed isolated runtime tests; 49.9 and 51.beta passed core container checks, while image and physical-session validation remain pending. See the README matrix and development notes.
- Native preferences should use GTK/libadwaita with a system font chooser and searchable time-zone picker. Enumerate fonts dynamically from the GNOME font system, including user-installed and system-wide fonts; do not ship the preview’s font snapshot as a fixed production list.
- The overlay should sit above wallpaper and below normal application windows, without intercepting ordinary desktop input.
- Persist ordered clock records and appearance in GSettings. In the extension, use a native file chooser for backgrounds and persist a local image reference; handle missing or unreadable files with a clear fallback.
- Use one update timer; release timers, signals, actors, and service resources when disabled.
- Handle session lock, Overview, multiple monitors, workspace changes, scaling, and screen size changes explicitly during implementation.
- Display ordinary zone abbreviations where available, falling back to a readable UTC/GMT offset. Labels remain separate from zone rules.

## Selected defaults

- Shared font, size, and opacity; global color with per-clock overrides.
- Inline layout, transparent background, top-left anchor, primary monitor.
- Seconds and day-difference indicators off by default.
- Native system-settings handoff; no privileged time-service helper.
- Four corner anchors and monitor selection; no drag-to-position interaction.

## Preview verification

The preview was opened and visually inspected in a browser. Additions to ten clocks, the disabled add control at capacity, custom descriptions, quarter-hour zones, font changes, 12-hour time, aligned layout, and date differences were exercised. The desktop layout and narrow stacked presentation were inspected. The updated font selector was verified against 505 installed font families. Font filtering, font selection, opacity, per-clock colors surviving global color changes, and restoring global color inheritance were also verified. The two-column grid and wrapping horizontal strip were visually inspected, including the grid collapsing at a narrow width. Solid-color selection, local PNG background loading, and switching back to transparency were exercised. These checks validate the design prototype, not GNOME integration or NTP accuracy.

## References

- [NTP Pool usage guidance](https://www.ntppool.org/en/use.html): nearby-country server selection and use of known local/ISP servers.
- [chrony configuration reference](https://chrony-project.org/doc/latest/chrony.conf.html): server/pool configuration and source selection behavior.
- [GNOME extension review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html): extension lifecycle and resource cleanup.
- [GNOME extension best practices](https://gjs.guide/extensions/review-guidelines/best-practices.html): system-service communication and maintainable extension design.

Consulted 2026-09-04. An implementation has now been installed and exercised in a disposable GNOME 50.4 test session. No public release or installation into the active desktop has been performed.
