# Physical desktop acceptance

Session: 2026-09-04, Fedora desktop, GNOME Shell 50.4, Wayland.
Results below are the owner's observations, separate from the automated virtual-session tests.

## Confirmed by the owner

- All eight clocks are visible and level.
- Clocks remain behind application windows.
- The desktop remains clickable around the clocks.
- Font selection, font size, global text color, opacity, and text-shadow controls behave as expected.
- Layouts look good except for the aligned time column's right justification.

## Aligned time column confirmed by the owner

The owner confirmed that Aligned Time Column right-aligns each time and its optional day label inside the shared column. Labels with different rendered widths end at the same right edge. The regression check measures text layout boundaries in GNOME 50.4; the full isolated suite, lint, model checks, and adversarial input checks pass. A native example is available in [desktop-aligned.png](desktop-aligned.png).

## Four-group feature confirmed by the owner

The owner confirmed that four groups appear on the physical desktop and that changing Group 2 appearance does not affect Group 1. The extension supports up to ten clocks per group. The Groups page selects the count and the group edited by Clocks/Appearance. Group 1 uses the existing settings path; hidden groups retain their configuration. The automated suite covers 40 clocks, shared scheduling, independent settings, group removal/restoration, and preferences image cancellation.

## Subsequent desktop feedback

The owner confirmed the Inline layout's three extra spaces after the combined clock name/abbreviation, before the dash and time. The full GNOME 50.4 suite passes.

## Clock controls and backgrounds confirmed by the owner

On 2026-09-08, the owner confirmed the following behavior on the physical GNOME desktop:

- Clocks can be added, removed, and reordered.
- A blank custom description falls back to the selected time-zone name.
- Time-zone abbreviations can be hidden independently for each clock.
- Global and per-clock font colors work as expected.
- Transparent, solid-color, and local-image backgrounds work as expected, including image replacement.
- Appearance changes made to Group 2 do not affect Group 1.

## Session behavior confirmed by the owner

On 2026-09-08, the owner confirmed the following behavior on the physical GNOME desktop:

- Clocks return correctly after locking and unlocking, without duplicate groups.
- Clocks resume with the correct time after system suspend and resume.
- Clocks hide while the Overview is open and return when it closes.
- Clocks hide on a monitor containing a full-screen application and return after full-screen mode ends.

## Display scaling confirmed by the owner

On 2026-09-08, the owner confirmed that the four clock groups remain visible, correctly positioned, aligned, and unclipped after changing the physical desktop's display scaling and returning to the normal setting. The available system has one 5120 x 2160 monitor, so a multi-monitor arrangement was not available for physical testing.

## Time service and settings persistence confirmed by the owner

On 2026-09-08, the owner confirmed the following behavior on the physical GNOME desktop:

- The Time sync page reports the system synchronization status.
- Refresh status updates the displayed check time.
- Open Date & Time launches the GNOME Date & Time settings panel.
- Clock groups, positions, colors, backgrounds, descriptions, and abbreviation choices persist after logging out and back in.

## Resource observation and extended acceptance

On 2026-09-08, a 45-second enabled/disabled observation used the owner's current one-group, eight-clock, minute-only configuration. The measurement covered the complete GNOME Shell service rather than the extension in isolation:

- Enabled Shell CPU time was 7.799 seconds, or 17.3% of one CPU core during the interval.
- Disabled Shell CPU time was 8.415 seconds, or 18.7% of one CPU core during the interval. Normal Shell and desktop activity exceeded any measurable extension CPU cost in this sample.
- Re-enabling the extension changed whole-service memory by approximately 1.8 MiB relative to the disabled endpoint. This is an observation, not a precise per-extension allocation measurement.
- GNOME Shell reported no extension errors after the comparison, and the clocks returned in the active state.

Physical acceptance sessions from 2026-09-04 through 2026-09-08 included repeated settings changes, login, lock/unlock, suspend/resume, Overview, full-screen, background, and scaling checks without a reported functional failure. Multi-monitor behavior remains untested because the available system has one monitor.

GNOME 49 and 51 testing gaps remain documented in [DEVELOPMENT.md](DEVELOPMENT.md).
