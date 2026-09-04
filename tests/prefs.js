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

let failed = false;
const app = new Adw.Application({application_id: 'io.github.infamous_pattern.WorldClocksTest'});
app.connect('activate', () => {
    const run = async () => {
        const window = new Adw.PreferencesWindow({application: app, default_width: 660, default_height: 740, title: 'Desktop World Clocks'});
        const settings = extension.stateObj.getSettings();
        const preferences = new Preferences(window, settings);
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
        const resultDir = GLib.build_filenamev([GLib.getenv('WORLD_CLOCK_TEST_ROOT'), 'test-results']);
        const sourceImage = Gio.File.new_for_path(`${resultDir}/desktop.png`);
        preferences._prepareImage(sourceImage);
        for (let attempt = 0; attempt < 30 && !settings.get_string('background-image'); attempt++)
            await pause(100);
        const firstImage = settings.get_string('background-image');
        assert(firstImage && GLib.file_test(firstImage, GLib.FileTest.IS_REGULAR), 'Image prepared and stored locally');
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
        preferences.close();
        window.close();
        print('PASS: native preferences, live font chooser, zone picker, clock editor, and cleanup');
    };
    run().catch(error => {
        failed = true;
        console.error(error);
    }).finally(() => app.quit());
});
await app.runAsync([]);
if (failed)
    throw new Error('Native preferences test failed');
