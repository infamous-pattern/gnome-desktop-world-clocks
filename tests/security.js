// SPDX-License-Identifier: GPL-2.0-or-later
import {cssString, managedImagePath, MAX_SETTINGS_LENGTH, readClocks, validColor} from '../shared/model.js';
import {groupSettings} from '../shared/groups.js';
import GLib from 'gi://GLib';
let checks = 0;
function check(condition, name) {
    if (!condition)
        throw new Error(name);
    checks++;
}
function read(value) {
    return readClocks({get_string: () => value});
}
for (const value of ['', '{', 'null', '{}', '123', '"text"'])
    check(read(value).length === 0, 'Invalid settings reject safely');
check(read(JSON.stringify([null, 1, {}, {zone: 4}])).length === 0, 'Malformed records reject safely');
check(read(JSON.stringify(Array.from({length: 1000}, () => ({zone: 'UTC'})))).length === 10, 'Clock allocation is capped');
check(read(JSON.stringify([{zone: 'UTC', label: 'x'.repeat(10000)}]))[0].label.length === 60, 'Labels are capped');
for (const color of ['red; background-image: url(file:///tmp/a)', '#ffffff;', '#abc', 'url(https://example.invalid)', null])
    check(validColor(color, '#ffffff') === '#ffffff', 'CSS color injection rejected');
const input = 'A"; background-image: url(file:///tmp/x); /*\\\n\r\f';
check(cssString(input) === '"A\\"; background-image: url(file:///tmp/x); /*\\\\   "', 'CSS delimiters quoted and escaped');
const record = read(JSON.stringify([{zone: 'UTC', label: '<b>Example</b>', color: '#123456'}]))[0];
check(record.label === '<b>Example</b>', 'Labels remain literal data for text-only rendering');
check(read(' '.repeat(MAX_SETTINGS_LENGTH + 1)).length === 0, 'Oversized settings rejected before parsing');
for (const zone of ['/etc/localtime', '../UTC', 'Europe/../London', 'Europe//London', 'https://example.invalid'])
    check(read(JSON.stringify([{zone}])).length === 0, 'Only zone identifiers accepted');
for (const path of ['/etc/passwd', '/tmp/image.png', 'https://example.invalid/image.png', ''])
    check(!managedImagePath(path), 'Unmanaged image path rejected');
const managed = GLib.build_filenamev([GLib.get_user_data_dir(), 'desktop-world-clocks', 'background-12345678-1234-1234-1234-123456789abc.png']);
check(managedImagePath(managed), 'Managed image accepted');
for (const index of [-1, 4, 99, 1.5, '1', NaN]) {
    let rejected = false;
    try {
        groupSettings(null, index);
    } catch (error) {
        rejected = error instanceof RangeError;
    }
    check(rejected, 'Group index is bounded before settings access');
}
print(`PASS: ${checks} adversarial input checks`);
