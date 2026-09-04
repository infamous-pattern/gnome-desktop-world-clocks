// SPDX-License-Identifier: GPL-2.0-or-later
// Run only in the disposable compositor launched by scripts/test-shell.py.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

const coreOnly = GLib.getenv('WORLD_CLOCK_CORE_ONLY') === '1';
const UUID = 'desktop-world-clocks@infamous-pattern.github.io';
export const METRICS = {};

function assert(value, message) {
    if (!value)
        throw new Error(message);
}

export async function run() {
    Main.overview.hide();
    await Scripting.sleep(1000);
    // Extension loading can finish after the compositor's startup notification.
    for (let attempt = 0; attempt < 50 && !Main.extensionManager.lookup(UUID)?.stateObj?._controller; attempt++)
        await Scripting.sleep(100);
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

    // Unequal time widths must end at the same column edge, including day labels.
    controller._stopTimer();
    for (const [index, item] of controller._items.entries()) {
        item.time.set_text(index % 2 ? '11:11' : '8:58 PM');
        item.day.set_text(index % 2 ? '+1 day' : '');
        item.day.visible = Boolean(item.day.text);
    }
    await Scripting.sleep(100);
    const rightEdge = label => {
        const text = label.clutter_text;
        const [, logical] = text.get_layout().get_pixel_extents();
        const scale = text.get_transformed_size()[0] / text.width;
        return text.get_transformed_position()[0] + (logical.x + logical.width) * scale;
    };
    const edge = rightEdge(controller._items[0].time);
    for (const item of controller._items) {
        assert(Math.abs(rightEdge(item.time) - edge) < 1, 'Aligned times share a right edge');
        if (item.day.visible)
            assert(Math.abs(rightEdge(item.day) - edge) < 1, 'Day labels share the time column right edge');
    }
    print('PASS: aligned times and day labels share a right edge');
    controller._update();
    controller._syncTimer();

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
    if (!coreOnly) {
        const desktopBackground = new Gio.Settings({schema_id: 'org.gnome.desktop.background'});
        desktopBackground.set_string('picture-uri', '');
        desktopBackground.set_string('picture-uri-dark', '');
        desktopBackground.set_string('picture-options', 'none');
        desktopBackground.set_string('primary-color', '#172a24');
        desktopBackground.set_string('color-shading-type', 'solid');
        await Scripting.sleep(300);
        const resultDir = `${GLib.getenv('WORLD_CLOCK_TEST_ROOT')}/test-results`;
        GLib.mkdir_with_parents(resultDir, 0o700);
        const stream = Gio.File.new_for_path(`${resultDir}/desktop.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
        const [captured] = await new Shell.Screenshot().screenshot(false, stream);
        assert(captured, 'Desktop screenshot captured successfully');
        stream.close(null);
        // Keep the README detail at native pixel size on typical GitHub pages.
        settings.set_boolean('text-shadow', false);
        await Scripting.sleep(200);
        const detailStream = Gio.File.new_for_path(`${resultDir}/desktop-detail.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
        const [detailCaptured] = await new Shell.Screenshot().screenshot_area(0, 32, 480, 384, detailStream);
        assert(detailCaptured, 'Desktop detail screenshot captured successfully');
        detailStream.close(null);
        settings.set_string('layout', 'aligned');
        settings.set_boolean('use-12-hour', true);
        await Scripting.sleep(200);
        const alignedStream = Gio.File.new_for_path(`${resultDir}/desktop-aligned.png`).replace(null, false, Gio.FileCreateFlags.NONE, null);
        const [alignedCaptured] = await new Shell.Screenshot().screenshot_area(0, 32, 720, 384, alignedStream);
        assert(alignedCaptured, 'Aligned layout screenshot captured successfully');
        alignedStream.close(null);
        settings.reset('layout');
        settings.reset('use-12-hour');
        settings.reset('text-shadow');
    }
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
    print(`PASS: GNOME Shell layouts, colors, opacity, scheduling, and five lifecycle cycles${coreOnly ? ' (partial: images/screenshots excluded)' : ''}`);
}
