// SPDX-License-Identifier: GPL-2.0-or-later

export const MAX_GROUPS = 4;

export function groupSettings(settings, index) {
    if (!Number.isInteger(index) || index < 0 || index >= MAX_GROUPS)
        throw new RangeError('Invalid clock group');
    // Group 1 retains the original settings path, preserving existing installations.
    return index === 0 ? settings : settings.get_child(`group${index + 1}`);
}
