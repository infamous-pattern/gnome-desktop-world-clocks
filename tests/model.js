// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {boundaryDelay, clockText, locationName, readClocks, validColor, writeClocks} from '../shared/model.js';
import {loadZones} from '../prefs/zones.js';

let checks = 0;
function equal(actual, expected, label) {
    if (actual !== expected)
        throw new Error(`${label}: expected ${expected}, got ${actual}`);
    checks++;
}

const options = {seconds: false, abbreviations: true, dayDifference: true, twelveHour: false};
function at(iso, zone, overrides = {}, recordOverrides = {}) {
    return clockText({zone, label: '', showAbbr: true, ...recordOverrides}, GLib.TimeZone.new_identifier(zone),
        GLib.DateTime.new_from_iso8601(iso, GLib.TimeZone.new_utc()), {...options, ...overrides});
}

equal(at('2026-03-08T09:59:00Z', 'America/Los_Angeles').time, '01:59', 'Before spring DST jump');
equal(at('2026-03-08T10:00:00Z', 'America/Los_Angeles').time, '03:00', 'After spring DST jump');
equal(at('2026-11-01T08:59:00Z', 'America/Los_Angeles').time, '01:59', 'Before autumn DST repeat');
equal(at('2026-11-01T09:00:00Z', 'America/Los_Angeles').time, '01:00', 'After autumn DST repeat');
equal(at('2026-01-01T00:00:00Z', 'Europe/London').name, 'London GMT', 'Winter abbreviation');
equal(at('2026-07-01T00:00:00Z', 'Europe/London').name, 'London BST', 'Summer abbreviation');
equal(at('2026-07-01T00:00:00Z', 'Asia/Kolkata').time, '05:30', 'Half-hour offset');
equal(at('2026-07-01T00:00:00Z', 'Asia/Kathmandu').time, '05:45', 'Quarter-hour offset');
equal(at('2026-07-01T00:00:00Z', 'Pacific/Chatham').time, '12:45', 'Chatham offset');
equal(at('2026-12-31T23:00:00Z', 'Pacific/Kiritimati').difference, 1, 'Next calendar year');
equal(at('2026-01-01T00:00:00Z', 'America/Los_Angeles').difference, -1, 'Previous calendar year');
equal(at('2026-07-01T00:00:00Z', 'Europe/London', {}, {showAbbr: false}).name, 'London', 'Per-clock abbreviation hidden');
equal(at('2026-07-01T00:00:00Z', 'Europe/London', {abbreviations: false}).name, 'London', 'Global abbreviation hidden');
equal(at('2026-07-01T00:00:00Z', 'Europe/London', {}, {label: 'Support', showAbbr: false}).name, 'Support', 'Custom description');
equal(locationName('America/Argentina/Buenos_Aires'), 'Buenos Aires', 'Location default');
equal(validColor('red; background:red', '#ffffff'), '#ffffff', 'Invalid CSS color rejected');
equal(boundaryDelay(12345, false), 47655, 'Minute boundary scheduling');
equal(boundaryDelay(12345, true), 655, 'Second boundary scheduling');

const source = Gio.SettingsSchemaSource.new_from_directory(`${GLib.get_current_dir()}/schemas`, Gio.SettingsSchemaSource.get_default(), false);
const settings = new Gio.Settings({settings_schema: source.lookup('org.gnome.shell.extensions.desktop-world-clocks', false), backend: Gio.memory_settings_backend_new()});
settings.set_string('clocks', 'not json');
equal(readClocks(settings).length, 0, 'Invalid saved JSON');
writeClocks(settings, Array.from({length: 12}, () => ({zone: 'UTC', label: '', showAbbr: false, color: '#aabbcc'})));
equal(readClocks(settings).length, 10, 'Ten-clock limit');
equal(readClocks(settings)[0].showAbbr, false, 'Individual settings survive save');
equal(readClocks(settings)[0].color, '#aabbcc', 'Color override survives save');

const loop = GLib.MainLoop.new(null, false);
loadZones(new Gio.Cancellable()).then(zones => {
    equal(zones.includes('Asia/Kolkata'), true, 'Canonical zone picker entry');
    equal(zones.includes('Asia/Calcutta'), true, 'Legacy alias picker entry');
    equal(zones.includes('UTC'), true, 'UTC picker entry');
    print(`PASS: ${checks} model checks; ${zones.length} system time zones and aliases`);
}).catch(error => {
    printerError(error);
}).finally(() => loop.quit());
let failed = false;
function printerError(error) {
    failed = true;
    console.error(error);
}
loop.run();
if (failed)
    throw new Error('Time zone checks failed');
