// SPDX-License-Identifier: GPL-2.0-or-later
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.
import GLib from 'gi://GLib';

export const MAX_CLOCKS = 10;
export const MAX_SETTINGS_LENGTH = 32768;
export const LAYOUTS = ['classic', 'aligned', 'stacked', 'grid', 'strip'];
export const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const BACKGROUNDS = ['transparent', 'solid', 'image'];

export function locationName(zone) {
    return zone.split('/').at(-1).replaceAll('_', ' ');
}

export function validColor(value, fallback = '') {
    return typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value) ? value : fallback;
}

export function readClocks(settings) {
    const serialized = settings.get_string('clocks');
    if (serialized.length > MAX_SETTINGS_LENGTH)
        return [];
    let records;
    try {
        records = JSON.parse(serialized);
    } catch {
        return [];
    }
    if (!Array.isArray(records))
        return [];

    return records.slice(0, MAX_CLOCKS).filter(record =>
        record && typeof record.zone === 'string' && record.zone.length <= 100 && /^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/.test(record.zone)
    ).map(record => ({
        zone: record.zone,
        label: typeof record.label === 'string' ? record.label.trim().slice(0, 60) : '',
        color: validColor(record.color),
        showAbbr: record.showAbbr !== false,
    }));
}

export function writeClocks(settings, records) {
    settings.set_string('clocks', JSON.stringify(records.slice(0, MAX_CLOCKS)));
}

export function dateOrdinal(date) {
    const day = GLib.Date.new_dmy(date.get_day_of_month(), date.get_month(), date.get_year());
    return day.get_julian();
}

export function clockText(record, zone, now, options) {
    const local = now.to_timezone(zone);
    const description = record.label || locationName(record.zone);
    let abbreviation = options.abbreviations && record.showAbbr ? local.format('%Z') : '';
    if (/^[+-]/.test(abbreviation))
        abbreviation = `UTC${local.format('%:z')}`;
    const format = options.twelveHour
        ? (options.seconds ? '%I:%M:%S %p' : '%I:%M %p')
        : (options.seconds ? '%H:%M:%S' : '%H:%M');
    const difference = options.dayDifference ? dateOrdinal(local) - dateOrdinal(now) : 0;
    return {
        name: abbreviation ? `${description} ${abbreviation}` : description,
        time: local.format(format),
        difference,
    };
}

export function boundaryDelay(realTimeMilliseconds, seconds) {
    const interval = seconds ? 1000 : 60000;
    return Math.max(10, interval - realTimeMilliseconds % interval);
}

export function cssString(value) {
    return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replace(/[\n\r\f]/g, ' ')}"`;
}

export function managedImagePath(path) {
    const directory = GLib.build_filenamev([GLib.get_user_data_dir(), 'desktop-world-clocks']);
    return GLib.path_get_dirname(path) === directory && /^background-[a-f0-9-]{36}\.png$/.test(GLib.path_get_basename(path));
}
