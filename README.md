# Desktop World Clocks

A proposed GNOME Shell extension that displays up to ten customizable world clocks directly over the desktop wallpaper.

**Status: interactive design preview. The GNOME extension has not been implemented.**

Open `design/preview.html` in a browser to explore the design. It is self-contained and needs no installation or build step. Changes last for the current page session only.

## Try the preview

- Add up to ten clocks and choose a time zone. Descriptions default to the selected location name, or you can write your own.
- Select an existing clock to edit or remove it; use the arrows to reorder clocks.
- Search all installed fonts; change size and opacity; choose a global font color or override it per clock. Adjust time format, placement, and text shadow.
- Compare reference-style inline clocks, aligned columns, and a large-time layout.
- Explore proposed time-source preferences in the Time sync section.

The clocks run from the browser device's time and use its time-zone rules. Synchronization settings are illustrative: this preview neither queries NTP servers nor changes the operating system. It does not establish whether the device clock is accurate.

See [the design brief](design/DESIGN.md) for requirements, implementation boundaries, and source references.

## Files

- `design/preview.html`: standalone interactive preview.
- `design/preview.fragment.html`: editable source for the in-conversation preview.
- `design/DESIGN.md`: proposed behavior and decisions to refine before implementation.

No GNOME extension files, system services, or installer are included at this stage.
