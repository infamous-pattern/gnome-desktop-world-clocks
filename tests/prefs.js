// SPDX-License-Identifier: GPL-2.0-or-later
// Native preferences smoke test; run in the isolated Shell test session.
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';

Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource')._register();
Gio.Resource.load('/usr/share/gnome-shell/gnome-shell-dbus-interfaces.gresource')._register();
const {extensionManager} = await import('resource:///org/gnome/Shell/Extensions/js/extensionsService.js');
const uuid = 'desktop-world-clocks@infamous-pattern.github.io';
const path = GLib.build_filenamev([GLib.get_user_data_dir(), 'gnome-shell', 'extensions', uuid]);
const directory = Gio.File.new_for_path(path);
const [, data] = directory.get_child('metadata.json').load_contents(null);
const metadata = JSON.parse(new TextDecoder().decode(data));
const serialized = {path: new GLib.Variant('s', path)};
for (const [key, value] of Object.entries(metadata))
    serialized[key] = new GLib.Variant(Array.isArray(value) ? 'as' : 's', value);
const extension = extensionManager.createExtensionObject(serialized);
const {default: Entry} = await import(`${directory.get_uri()}/prefs.js`);
extension.stateObj = new Entry({...metadata, dir: directory, path});
const {Preferences} = await import(`${directory.get_uri()}/prefs/window.js`);
const {loadImage} = await import(`${directory.get_uri()}/prefs/images.js`);

function pause(milliseconds) {
    return new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, milliseconds, () => {
        resolve();
        return GLib.SOURCE_REMOVE;
    }));
}

function assert(value, label) {
    if (!value)
        throw new Error(label);
}

function descendants(widget) {
    const result = [widget];
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling())
        result.push(...descendants(child));
    return result;
}

const coreOnly = GLib.getenv('WORLD_CLOCK_CORE_ONLY') === '1';
let failed = false;
const app = new Adw.Application({application_id: 'io.github.infamous_pattern.WorldClocksTest'});
app.connect('activate', () => {
    const run = async () => {
        const window = new Adw.PreferencesWindow({application: app, default_width: 660, default_height: 740, title: 'Desktop World Clocks'});
        const settings = extension.stateObj.getSettings();
        const preferences = new Preferences(window, settings, metadata);
        let lastError = '';
        const originalToast = preferences._toast.bind(preferences);
        preferences._toast = message => {
            lastError = message;
            originalToast(message);
        };
        preferences.build();
        window.present();
        await pause(500);
        assert(preferences._zones.includes('Asia/Kolkata'), 'Native zone database loaded');
        const widgets = descendants(window);
        assert(widgets.some(widget => widget instanceof Gtk.FontDialogButton), 'Native GNOME font chooser exists');
        assert(widgets.some(widget => widget instanceof Gtk.ColorDialogButton), 'Native color chooser exists');
        preferences._edit(-1);
        await pause(150);
        const editor = descendants(preferences._dialog);
        const picker = editor.find(widget => widget instanceof Gtk.DropDown);
        picker.selected = preferences._zones.indexOf('America/New_York');
        const entry = editor.find(widget => widget instanceof Gtk.Entry);
        assert(entry.placeholder_text === 'New York', 'Description follows selected zone');
        const abbreviation = editor.find(widget => widget instanceof Adw.SwitchRow && widget.title === 'Show time zone abbreviation');
        abbreviation.active = false;
        const save = editor.find(widget => widget instanceof Gtk.Button && widget.label === 'Save clock');
        save.emit('clicked');
        const saved = JSON.parse(settings.get_string('clocks')).at(-1);
        assert(saved.zone === 'America/New_York' && saved.label === '' && saved.showAbbr === false, 'Native editor saves defaults and per-clock option');
        await pause(200);
        if (!coreOnly) {
            const resultDir = GLib.build_filenamev([GLib.getenv('WORLD_CLOCK_TEST_ROOT'), 'test-results']);
            const sourceImage = Gio.File.new_for_path(`${resultDir}/desktop.png`);
            await preferences._prepareImage(sourceImage);
            const fixtureDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'image-fixtures']);
            GLib.mkdir_with_parents(fixtureDir, 0o700);
            const invalid = `${fixtureDir}/invalid.png`;
            const oversized = `${fixtureDir}/oversized.png`;
            const disguised = `${fixtureDir}/disguised.png`;
            GLib.file_set_contents(invalid, new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
            const large = new Uint8Array(10 * 1024 * 1024 + 1);
            large.set([137, 80, 78, 71, 13, 10, 26, 10]);
            GLib.file_set_contents(oversized, large);
            GLib.file_set_contents(disguised, '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
            const symlink = Gio.File.new_for_path(`${fixtureDir}/linked.png`);
            symlink.make_symbolic_link(sourceImage.get_path(), null);
            for (const file of [Gio.File.new_for_uri('https://example.invalid/test.png'), Gio.File.new_for_path(fixtureDir),
                Gio.File.new_for_path(invalid), Gio.File.new_for_path(oversized), Gio.File.new_for_path(disguised), symlink]) {
                let rejected = false;
                try {
                    await loadImage(file, new Gio.Cancellable());
                } catch {
                    rejected = true;
                }
                assert(rejected, 'Unsafe or malformed image rejected');
            }
            const cancelled = new Gio.Cancellable();
            cancelled.cancel();
            let cancelledRead = false;
            try {
                await loadImage(sourceImage, cancelled);
            } catch (error) {
                cancelledRead = error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED);
            }
            assert(cancelledRead, 'Image loading respects cancellation');
            const firstImage = settings.get_string('background-image');
            assert(firstImage && GLib.file_test(firstImage, GLib.FileTest.IS_REGULAR), `Image prepared and stored locally: ${lastError}`);
            const prepared = GdkPixbuf.Pixbuf.new_from_file(firstImage);
            assert(prepared.get_width() <= 2048 && prepared.get_height() <= 2048, 'Background dimensions bounded');
            preferences._saveImage(prepared);
            await pause(100);
            assert(firstImage !== settings.get_string('background-image'), 'Image replacement gets a fresh texture URI');
            assert(!GLib.file_test(firstImage, GLib.FileTest.EXISTS), 'Previous managed image cleaned up');
            settings.set_string('background-mode', 'image');
            const paintable = new Gtk.WidgetPaintable({widget: window});
            const snapshot = new Gtk.Snapshot();
            paintable.snapshot(snapshot, window.get_width(), window.get_height());
            const node = snapshot.to_node();
            const texture = window.get_renderer().render_texture(node, null);
            GLib.mkdir_with_parents(resultDir, 0o700);
            texture.save_to_png(`${resultDir}/preferences.png`);
        }
        const original = settings.get_string('clocks');
        const originalSize = settings.get_int('font-size');
        preferences._groupCountRow.value = 4;
        await pause(100);
        assert(settings.get_int('group-count') === 4, 'Group count control enables four groups');
        preferences._groupSelector.selected = 3;
        await pause(150);
        const fourth = preferences._settings;
        assert(fourth.get_string('position') === 'bottom-right', 'Fourth group starts in bottom-right corner');
        assert(preferences._clockRows.length === 1, 'New groups start with a single UTC clock');
        const sizeControl = descendants(window).find(widget => widget instanceof Adw.SpinRow && widget.title === 'Font size');
        sizeControl.value = 37;
        assert(fourth.get_int('font-size') === 37 && settings.get_int('font-size') === originalSize, 'Appearance edits affect selected group only');
        preferences._edit(0);
        await pause(100);
        const fourthEditor = descendants(preferences._dialog);
        fourthEditor.find(widget => widget instanceof Gtk.Entry).text = 'Fourth corner';
        fourthEditor.find(widget => widget instanceof Gtk.Button && widget.label === 'Save clock').emit('clicked');
        assert(JSON.parse(fourth.get_string('clocks'))[0].label === 'Fourth corner', 'Clock editor saves to selected group');
        assert(settings.get_string('clocks') === original, 'Group 1 clocks preserved');
        const pendingImage = !coreOnly ? preferences._prepareImage(Gio.File.new_for_path(`${GLib.getenv('WORLD_CLOCK_TEST_ROOT')}/test-results/desktop.png`)) : null;
        preferences._groupCountRow.value = 1;
        await pause(150);
        if (pendingImage)
            await pendingImage;
        assert(preferences._groupIndex === 0 && preferences._settings === settings, 'Hiding the edited group selects Group 1');
        assert(fourth.get_string('background-image') === '', 'Switching groups cancels an in-flight image import');
        sizeControl.value = 22;
        assert(fourth.get_int('font-size') === 37 && settings.get_int('font-size') === originalSize, 'Old settings bindings released');
        preferences._groupCountRow.value = 4;
        await pause(100);
        preferences._groupSelector.selected = 3;
        await pause(150);
        assert(preferences._settings.get_int('font-size') === 37, 'Hidden group appearance retained');
        assert(preferences._clockRows[0].title === 'Fourth corner', 'Hidden group clocks retained');
        if (!coreOnly) {
            const pixbuf = GdkPixbuf.Pixbuf.new_from_file(settings.get_string('background-image'));
            const originalImage = settings.get_string('background-image');
            preferences._saveImage(pixbuf);
            await pause(100);
            assert(fourth.get_string('background-image') !== originalImage, 'Groups have independent managed image copies');
            assert(GLib.file_test(originalImage, GLib.FileTest.IS_REGULAR), 'Replacing another group image preserves Group 1 image');
        }
        for (const key of ['font-size', 'clocks', 'background-image'])
            fourth.reset(key);
        preferences._groupCountRow.value = 1;
        print(coreOnly ? 'PASS: group selector, independent clock/appearance edits, and preserved hidden settings'
            : 'PASS: group selector, independent clock/appearance/image edits, cancellation, and preserved hidden settings');
        window.visible_page = preferences._about;
        await pause(200);
        if (!coreOnly) {
            const paintable = new Gtk.WidgetPaintable({widget: window});
            const snapshot = new Gtk.Snapshot();
            paintable.snapshot(snapshot, window.get_width(), window.get_height());
            const texture = window.get_renderer().render_texture(snapshot.to_node(), null);
            texture.save_to_png(`${GLib.getenv('WORLD_CLOCK_TEST_ROOT')}/test-results/about.png`);
        }
        preferences.close();
        window.close();
        print(coreOnly ? 'PASS: native preferences and zone/font controls (partial: images/screenshots excluded)'
            : 'PASS: native preferences, zone/font controls, image limits, seven image rejection/cancellation checks, and cleanup');
    };
    run().catch(error => {
        failed = true;
        console.error(error);
    }).finally(() => app.quit());
});
await app.runAsync([]);
if (failed)
    throw new Error('Native preferences test failed');
