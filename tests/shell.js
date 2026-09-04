// SPDX-License-Identifier: GPL-2.0-or-later
// Run only in the disposable compositor launched by scripts/test-shell.py.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

const UUID = 'desktop-world-clocks@infamous-pattern.github.io';
export const METRICS = {};

function assert(value, message) {
    if (!value)
        throw new Error(message);
}

export async function run() {
    Main.overview.hide();
    await Scripting.sleep(1000);
    const extension = Main.extensionManager.lookup(UUID);
    assert(extension, 'Extension discovered');
    assert(!extension.error, `Extension startup: ${extension.error}`);
    const instance = extension.stateObj;
    assert(instance?._controller, 'Extension enabled');
    let controller = instance._controller;
    const settings = controller._settings;
    assert(controller._items.length === 8, 'Eight default clocks');
    assert(controller._actor.mapped, 'Clock surface is on the desktop');
    assert(controller._timerId > 0, 'One active clock timer');
    assert(GLib.MainContext.default().find_source_by_id(controller._timerId), 'Timer source exists');

    for (const layout of ['classic', 'aligned', 'stacked', 'grid', 'strip']) {
        settings.set_string('layout', layout);
        await Scripting.sleep(100);
        assert(controller._items.length === 8, `${layout}: all clocks retained`);
        assert(controller._items[0].name.text.includes('Los Angeles'), `${layout}: description visible`);
    }
    settings.set_string('background-mode', 'solid');
    settings.set_string('background-color', '#24334b');
    settings.set_int('text-opacity', 50);
    await Scripting.sleep(100);
    assert(controller._actor.get_style().includes('#24334b'), 'Solid background applied');
    assert(controller._content.opacity === 127 || controller._content.opacity === 128, 'Text opacity applied');
    assert(controller._actor.opacity === 255, 'Background opacity independent');

    const clocks = JSON.parse(settings.get_string('clocks'));
    clocks[0].showAbbr = false;
    clocks[0].color = '#00ff00';
    clocks[0].label = '';
    settings.set_string('clocks', JSON.stringify(clocks));
    settings.set_string('layout', 'aligned');
    await Scripting.sleep(100);
    assert(controller._items[0].name.text === 'Los Angeles', 'Per-clock abbreviation and default description');
    assert(controller._items[0].cell.get_style().includes('#00ff00'), 'Per-clock color');

    Main.overview.show();
    await Scripting.sleep(500);
    assert(controller._timerId === 0, 'No clock wakeups in Overview');
    Main.overview.hide();
    await Scripting.sleep(500);
    assert(controller._timerId > 0, 'Timer resumes after Overview');
    settings.set_boolean('show-seconds', true);
    await Scripting.sleep(1200);
    assert(/\d\d:\d\d:\d\d/.test(controller._items[0].time.text), 'Seconds refresh');

    for (let iteration = 0; iteration < 5; iteration++) {
        const source = controller._timerId;
        instance.disable();
        assert(!GLib.MainContext.default().find_source_by_id(source), 'No source remains after disable');
        assert(controller._signals.length === 0 && controller._items.length === 0, 'Signals and clock resources cleared');
        assert(controller._actor === null && controller._settings === null, 'Actors and settings released');
        instance.enable();
        controller = instance._controller;
        await Scripting.sleep(100);
        const surfaces = Main.layoutManager._backgroundGroup.get_children().filter(actor => actor.name === 'desktop-world-clocks');
        assert(surfaces.length === 1, 'Only one surface after repeated enable/disable');
    }
    settings.reset('show-seconds');
    settings.set_boolean('show-seconds', false);
    settings.set_string('layout', 'classic');
    settings.set_int('text-opacity', 100);
    settings.set_string('background-mode', 'transparent');
    await Scripting.sleep(200);
    const stableCell = controller._items[0].cell;
    controller._update();
    assert(stableCell === controller._items[0].cell, 'Clock ticks reuse widgets');
    settings.set_string('position', 'top-right');
    settings.set_string('background-mode', 'solid');
    await Scripting.sleep(200);
    const [, compactWidth] = controller._actor.get_preferred_width(-1);
    assert(compactWidth < 800 && controller._actor.x > 400, 'Background fits text and right anchor works');
    settings.set_int('font-size', 48);
    settings.set_string('clocks', JSON.stringify([...clocks, {zone: 'Pacific/Chatham', label: 'A long clock description that should wrap onto another line'}, {zone: 'Asia/Kathmandu'}]));
    await Scripting.sleep(200);
    assert(controller._items.length === 10, 'Ten clocks supported');
    const [, fullWidth] = controller._actor.get_preferred_width(-1);
    const [, fullHeight] = controller._actor.get_preferred_height(fullWidth);
    assert(fullHeight * controller._actor.scale_y <= controller._area.height - 2 * controller._margin + 1, 'Large clocks fit available height');
    settings.set_string('clocks', '[]');
    await Scripting.sleep(100);
    assert(!controller._actor.visible && controller._timerId === 0, 'Empty list consumes no clock timer');
    settings.reset('clocks');
    settings.reset('font-size');
    settings.reset('position');
    settings.reset('background-mode');
    await Scripting.sleep(200);
    const resultDir = `${GLib.getenv('WORLD_CLOCK_TEST_ROOT')}/test-results`;
    GLib.mkdir_with_parents(resultDir, 0o700);
    const stream = Gio.File.new_for_path(`${resultDir}/desktop.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
    await new Shell.Screenshot().screenshot(false, stream);
    stream.close(null);
    const process = Gio.Subprocess.new(['gjs', '-m', `${GLib.getenv('WORLD_CLOCK_TEST_ROOT')}/tests/prefs.js`], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    const [, output, errors] = await new Promise((resolve, reject) => {
        process.communicate_utf8_async(null, null, (source, result) => {
            try {
                resolve(source.communicate_utf8_finish(result));
            } catch (error) {
                reject(error);
            }
        });
    });
    print(output);
    assert(process.get_successful(), `Native preferences test: ${errors}`);
    print('PASS: GNOME Shell rendering, layouts, colors, opacity, scheduling, and five lifecycle cycles');
}
