# Design brief — version 01

## Direction

Text directly over the wallpaper, inspired by the supplied reference. The starting layout is `Description abbreviation – HH:MM`, with a light text shadow and no panel surrounding the desktop clocks. Preferences are shown beside the desktop for review; the actual extension would use a separate native preferences window.

Working repository name: `gnome-desktop-world-clocks`.
User-facing name: **Desktop World Clocks**.

## Core requirements

1. Support up to ten independently selected time zones, including multiple labels for the same zone.
2. Offer the complete current system time-zone database, UTC, and recognized aliases. Persist zone identifiers, not hard-coded offsets or abbreviations.
3. Allow an optional custom description for each clock. If omitted or cleared, use the selected time zone’s city/location name (for example, `America/New_York` becomes `New York`). Automatically filled descriptions follow subsequent zone selections; user-written descriptions are preserved. The preview accepts up to 60 characters and wraps long text.
4. Provide installed-font selection, size, and color. Version 01 applies appearance to all clocks together.
5. Derive all clock readings from one synchronized system clock. Apply each selected zone's daylight-saving and historical rule changes through the system time-zone database.
6. Support nearby NTP sources and a specified local/custom NTP server, with truthful synchronization status.

## Preview interactions

- Eight starting locations match the supplied reference: Los Angeles, Austin, London, Vienna, Pune, Singapore, Japan, and Melbourne.
- Time is live device time; displayed abbreviations follow the current date, rather than copying the reference's seasonal abbreviations.
- Add, rename, change zone, remove, and reorder clocks. Adding is disabled at ten.
- Font, 14–48 px size, text color, 12/24-hour display, optional seconds, optional date difference relative to the device, and text shadow.
- Inline, aligned-column, and stacked layouts; four desktop corner anchors.
- Source selection is only a preview preference. No network requests or system changes occur.

The embedded list contains 597 system time-zone identifiers and aliases captured on 2026-09-04. The preview filters out entries unsupported by the browser's time-zone engine. This snapshot is not a replacement for a native, dynamically enumerated system zone database. The prototype font suggestions were populated from installed font families; browsers can fall back when a requested font is unavailable.

## Synchronization design

The GNOME overlay should display the operating system clock. A system time service, such as chrony on Fedora, should synchronize that clock. NTP does not need a separate connection for each displayed time zone.

Proposed preference choices:

- **Automatic / nearby pool:** use geographically nearby pool candidates; allow the system service to assess source reliability and timing quality.
- **Local or custom server:** accept a user-supplied hostname or IP; retain suitable pool fallback where allowed by the user's policy.
- **Existing configuration:** preserve the administrator's current sources.

“Nearby” is not a guarantee of the geographically nearest or lowest-latency server. NTP Pool generally returns servers in or near the client's country. A local LAN server must be configured or supplied; the extension must not assume one exists or invent its address.

Configuration belongs to the privileged system time service. The implementation phase must decide between a native system-settings handoff and a narrowly scoped authenticated helper. Do not attempt root actions or system configuration writes inside GNOME Shell. The preview does not implement either route.

The finished product must distinguish synchronized, unsynchronized, unavailable, and stale/unreachable source states based on actual service evidence. Continue showing the system clock during outages and report status in preferences. Do not show fabricated server addresses, latency, offset, or last-sync measurements.

## GNOME implementation considerations

- Initial development target: GNOME Shell 50, observed locally as 50.4. Other versions need explicit compatibility testing before being declared supported.
- Native preferences should use GTK/libadwaita with a system font chooser and searchable time-zone picker.
- The overlay should sit above wallpaper and below normal application windows, without intercepting ordinary desktop input.
- Persist ordered clock records and appearance in GSettings.
- Use one update timer; release timers, signals, actors, and service resources when disabled.
- Handle session lock, Overview, multiple monitors, workspace changes, scaling, and screen size changes explicitly during implementation.
- Display ordinary zone abbreviations where available, falling back to a readable UTC/GMT offset. Labels remain separate from zone rules.

## Choices to refine

- Keep one shared appearance or allow optional per-clock overrides?
- Prefer inline rows or aligned time columns?
- Add drag-to-position, monitor selection, or a subtle background panel?
- Should next/previous-day indicators be enabled by default?
- Native system-settings handoff or authenticated time-source configuration helper?

## Preview verification

The preview was opened and visually inspected in a browser. Additions to ten clocks, the disabled add control at capacity, custom descriptions, quarter-hour zones, font changes, 12-hour time, aligned layout, and date differences were exercised. The desktop layout and narrow stacked presentation were inspected. These checks validate the design prototype, not GNOME integration or NTP accuracy.

## References

- [NTP Pool usage guidance](https://www.ntppool.org/en/use.html): nearby-country server selection and use of known local/ISP servers.
- [chrony configuration reference](https://chrony-project.org/doc/latest/chrony.conf.html): server/pool configuration and source selection behavior.
- [GNOME extension review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html): extension lifecycle and resource cleanup.
- [GNOME extension best practices](https://gjs.guide/extensions/review-guidelines/best-practices.html): system-service communication and maintainable extension design.

Consulted 2026-09-04. No public release or extension installation has been performed.
