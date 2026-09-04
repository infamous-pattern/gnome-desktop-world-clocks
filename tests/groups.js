// SPDX-License-Identifier: GPL-2.0-or-later
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

function assert(value, message) {
    if (!value)
        throw new Error(message);
}

export async function testGroups(instance) {
    let manager = instance._manager;
    const root = manager._settings;
    const originalClocks = root.get_string('clocks');
    const firstActor = manager._groups[0]._actor;
    root.set_int('group-count', 4);
    await Scripting.sleep(200);
    assert(manager._groups.length === 4, 'Four groups created');
    assert(manager._groups[0]._actor === firstActor && root.get_string('clocks') === originalClocks, 'Original group retained without migration');
    const settings = manager._groups.map(group => group._settings);
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    for (const [index, group] of manager._groups.entries()) {
        assert(group._settings.get_string('position') === corners[index], 'Groups start in separate corners');
        const clocks = Array.from({length: 10}, (_, clock) => ({zone: 'UTC', label: `Group ${index + 1} · ${clock + 1}`}));
        group._settings.set_string('clocks', JSON.stringify(clocks));
        group._settings.set_int('font-size', 14 + index);
    }
    await Scripting.sleep(200);
    assert(manager._groups.reduce((count, group) => count + group._items.length, 0) === 40, 'Forty clocks in four capped groups');
    assert(manager._groups.every((group, index) => group._items[0].name.text.startsWith(`Group ${index + 1}`)), 'Group clocks stay independent');
    assert(new Set(manager._groups.map(group => group._content.get_style())).size === 4, 'Group appearance stays independent');
    assert(manager._timerId > 0 && manager._groups.every(group => !group._timerId), 'All groups share one timer');

    // Only the seconds group should reformat while the minute remains unchanged.
    settings[3].set_boolean('show-seconds', true);
    await Scripting.sleep(100);
    let minuteUpdates = 0;
    let secondUpdates = 0;
    const minuteGroup = manager._groups[0];
    const secondGroup = manager._groups[3];
    const updateMinute = minuteGroup._update;
    const updateSecond = secondGroup._update;
    minuteGroup._update = function (...args) { minuteUpdates++; return updateMinute.apply(this, args); };
    secondGroup._update = function (...args) { secondUpdates++; return updateSecond.apply(this, args); };
    const startMinute = Math.floor(GLib.DateTime.new_now_local().to_unix() / 60);
    await Scripting.sleep(1200);
    assert(secondUpdates >= 1, 'Seconds group refreshes');
    if (startMinute === Math.floor(GLib.DateTime.new_now_local().to_unix() / 60))
        assert(minuteUpdates === 0, 'Minute groups skip second-only refreshes');
    minuteGroup._update = updateMinute;
    secondGroup._update = updateSecond;

    manager._sleeping = true;
    manager._refreshGroups();
    assert(manager._timerId === 0 && manager._groups.every(group => !group._actor.visible), 'All groups pause during sleep');
    manager._sleeping = false;
    manager._refreshGroups();
    Main.overview.show();
    await Scripting.sleep(300);
    assert(manager._timerId === 0, 'Four groups pause in Overview');
    Main.overview.hide();
    await Scripting.sleep(300);

    const removed = manager._groups.slice(1);
    root.set_int('group-count', 1);
    await Scripting.sleep(100);
    assert(removed.every(group => group._actor === null && group._signals.length === 0), 'Hidden groups release actors and signals');
    root.set_int('group-count', 4);
    await Scripting.sleep(200);
    assert(manager._groups[3]._settings.get_int('font-size') === 17 && manager._groups[3]._items.length === 10, 'Hidden group settings retained');
    for (const group of manager._groups)
        group._settings.set_string('clocks', '[]');
    await Scripting.sleep(100);
    assert(manager._timerId === 0, 'Four empty groups consume no timer');
    const previousManager = manager;
    instance.disable();
    assert(previousManager._timerId === 0 && !previousManager._sleepSubscription && previousManager._signals.length === 0, 'Manager fully cleaned up');
    assert(previousManager._groups.length === 0 && previousManager._settings === null, 'Manager releases group references');
    instance.enable();
    manager = instance._manager;
    await Scripting.sleep(200);
    assert(manager._groups.length === 4 && manager._timerId === 0, 'Four empty groups re-enable without a timer');
    for (const groupSettings of settings) {
        for (const key of ['clocks', 'font-size', 'show-seconds'])
            groupSettings.reset(key);
    }
    root.reset('group-count');
    await Scripting.sleep(200);
    assert(manager._groups.length === 1 && manager._timerId > 0, 'Return to original single-group behavior');
    print('PASS: four groups, 40 clocks, independent settings, shared scheduling, hiding, sleep, and cleanup');
}
