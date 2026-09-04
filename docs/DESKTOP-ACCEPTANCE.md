# Physical desktop acceptance

Session: 2026-09-04, Fedora desktop, GNOME Shell 50.4, Wayland.
Results below are the owner's observations, separate from the automated virtual-session tests.

## Confirmed by the owner

- All eight clocks are visible and level.
- Clocks remain behind application windows.
- The desktop remains clickable around the clocks.
- Font selection, font size, global text color, opacity, and text-shadow controls behave as expected.
- Layouts look good except for the aligned time column's right justification.

## Correction awaiting desktop retest

Aligned Time Column now right-aligns each time and its optional day label inside the shared column. Labels with different rendered widths end at the same right edge. The new regression check measures text layout boundaries in GNOME 50.4; the full isolated suite, lint, model checks, and adversarial input checks pass. A native example is available in [desktop-aligned.png](desktop-aligned.png).

The updated installed JavaScript requires a fresh GNOME session before the owner can confirm this fix on the physical desktop.

## Four-group feature awaiting desktop retest

The extension now supports four independent groups with up to ten clocks each. The Groups page selects the count and the group edited by Clocks/Appearance. Group 1 uses the existing settings path; hidden groups retain their configuration. The automated suite covers 40 clocks, shared scheduling, independent settings, group removal/restoration, and preferences image cancellation. A physical login and four-corner check are still required.

## Still pending

- Clock add/remove/reorder, description fallback, per-clock color and abbreviation controls.
- Transparent, solid, and local-image backgrounds; native file selection and image replacement.
- Lock/unlock, suspend/resume, Overview, and full-screen applications.
- Available monitor configurations and display scaling.
- Time-status display and settings persistence across login.
- Resource measurements and longer-running use.

GNOME 49 and 51 testing gaps remain documented in [DEVELOPMENT.md](DEVELOPMENT.md).
