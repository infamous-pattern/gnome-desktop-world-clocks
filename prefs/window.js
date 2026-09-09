// SPDX-License-Identifier: GPL-2.0-or-later
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GioUnix from 'gi://GioUnix';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {BACKGROUNDS, LAYOUTS, locationName, managedImagePath, MAX_CLOCKS, POSITIONS, readClocks, validColor, writeClocks} from '../shared/model.js';
import {groupSettings, MAX_GROUPS} from '../shared/groups.js';
import {loadZones} from './zones.js';
import {loadImage} from './images.js';
import {aboutPage} from './about.js';

function action(title, widget, subtitle = '') {
    const row = new Adw.ActionRow({title, subtitle, use_markup: false});
    widget.valign = Gtk.Align.CENTER;
    row.add_suffix(widget);
    row.activatable_widget = widget;
    return row;
}

function rgba(color) {
    const result = new Gdk.RGBA();
    result.parse(validColor(color, '#ffffff'));
    return result;
}

function hex(color) {
    return `#${[color.red, color.green, color.blue].map(value => Math.round(value * 255).toString(16).padStart(2, '0')).join('')}`;
}

function colorButton(color) {
    return new Gtk.ColorDialogButton({dialog: new Gtk.ColorDialog({with_alpha: false}), rgba: rgba(color)});
}

function button(icon, description, callback) {
    const result = new Gtk.Button({icon_name: icon, tooltip_text: description, valign: Gtk.Align.CENTER});
    result.connect('clicked', callback);
    return result;
}

export class Preferences {
    constructor(window, settings, metadata) {
        this._window = window;
        this._metadata = metadata;
        this._rootSettings = settings;
        this._allSettings = Array.from({length: MAX_GROUPS}, (_, index) => groupSettings(settings, index));
        this._settings = settings;
        this._groupIndex = -1;
        this._bindings = [];
        this._groupCancellable = new Gio.Cancellable();
        this._cancellable = new Gio.Cancellable();
        this._imageCancellable = null;
        this._zones = [];
        this._clockRows = [];
        this._dialog = null;
    }

    build() {
        this._groupsPage();
        this._selectGroup(0);
        this._timePage();
        this._about = aboutPage(this._metadata);
        this._window.add(this._about);
        this._groupCountId = this._rootSettings.connect('changed::group-count', () => this._refreshGroupSelector());
        loadZones(this._cancellable).then(zones => {
            if (this._cancellable.is_cancelled())
                return;
            this._zones = zones;
            this._clockGroup.description = _('Choose any system time zone or alias. Up to ten clocks per group.');
            this._refreshClocks();
        }).catch(error => {
            if (this._cancellable.is_cancelled())
                return;
            this._clockGroup.description = _('Unable to read the system time-zone database. Ensure tzdata is installed.');
            this._toast(error.message);
        });
    }

    close() {
        this._cancellable.cancel();
        this._imageCancellable?.cancel();
        this._groupCancellable.cancel();
        this._unbindGroup();
        if (this._groupCountId) {
            this._rootSettings.disconnect(this._groupCountId);
            this._groupCountId = 0;
        }
        Gio.Settings.unbind(this._groupCountRow, 'value');
        if (this._changedId) {
            this._settings.disconnect(this._changedId);
            this._changedId = 0;
        }
        if (this._dialog) {
            this._dialog.destroy();
            this._dialog = null;
        }
        this._clockRows = [];
        this._zones = [];
        this._window = null;
        this._settings = null;
        this._allSettings = [];
        this._rootSettings = null;
        this._metadata = null;
    }

    _groupsPage() {
        const page = this._page(_('Groups'), 'view-grid-symbolic');
        const group = new Adw.PreferencesGroup({title: _('Desktop clock groups'),
            description: _('Show up to four groups, each with its own clocks and appearance. Hidden groups keep their settings.')});
        page.add(group);
        this._groupCountRow = new Adw.SpinRow({title: _('Number of groups'),
            adjustment: new Gtk.Adjustment({lower: 1, upper: MAX_GROUPS, step_increment: 1, page_increment: 1})});
        this._rootSettings.bind('group-count', this._groupCountRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(this._groupCountRow);
        this._groupSelector = new Adw.ComboRow({title: _('Group to edit'),
            subtitle: _('The Clocks and Appearance pages apply to this group.')});
        group.add(this._groupSelector);
        this._refreshGroupSelector();
        this._groupSelector.connect('notify::selected', () => {
            if (!this._updatingSelector)
                this._selectGroup(this._groupSelector.selected);
        });
    }

    _refreshGroupSelector() {
        const count = this._rootSettings.get_int('group-count');
        const index = Math.min(Math.max(0, this._groupIndex), count - 1);
        this._updatingSelector = true;
        this._groupSelector.model = Gtk.StringList.new(Array.from({length: count}, (_value, i) => _('Group %s').replace('%s', `${i + 1}`)));
        this._groupSelector.selected = index;
        this._groupSelector.sensitive = count > 1;
        this._updatingSelector = false;
        if (this._groupIndex >= count)
            this._selectGroup(index);
    }

    _unbindGroup() {
        for (const [widget, property] of this._bindings)
            Gio.Settings.unbind(widget, property);
        this._bindings = [];
    }

    _selectGroup(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this._rootSettings.get_int('group-count') || index === this._groupIndex)
            return;
        const visible = this._window.visible_page;
        const wasAppearance = visible && visible === this._appearance;
        const wasClocks = visible && visible === this._clockPage;
        this._groupCancellable.cancel();
        this._groupCancellable = new Gio.Cancellable();
        this._imageCancellable?.cancel();
        if (this._dialog) {
            this._dialog.destroy();
            this._dialog = null;
        }
        if (this._changedId)
            this._settings.disconnect(this._changedId);
        this._unbindGroup();
        for (const page of [this._clockPage, this._appearance, this._time, this._about]) {
            if (page)
                this._window.remove(page);
        }
        this._clockRows = [];
        this._settings = this._allSettings[index];
        this._groupIndex = index;
        this._clocksPage();
        this._appearancePage();
        if (this._time)
            this._window.add(this._time);
        if (this._about)
            this._window.add(this._about);
        this._changedId = this._settings.connect('changed::clocks', () => this._refreshClocks());
        this._refreshClocks();
        if (wasAppearance)
            this._window.visible_page = this._appearance;
        else if (wasClocks)
            this._window.visible_page = this._clockPage;
    }

    _toast(message) {
        this._window.add_toast(new Adw.Toast({title: message}));
    }

    _page(title, icon) {
        const page = new Adw.PreferencesPage({title, icon_name: icon});
        this._window.add(page);
        return page;
    }

    _clocksPage() {
        const page = this._page(_('Clocks'), 'preferences-system-time-symbolic');
        this._clockPage = page;
        this._clockGroup = new Adw.PreferencesGroup({title: _('Clocks · Group %s').replace('%s', `${this._groupIndex + 1}`),
            description: this._zones.length ? _('Choose any system time zone or alias. Up to ten clocks per group.') : _('Loading system time zones…')});
        this._add = button('list-add-symbolic', _('Add clock'), () => this._edit(-1));
        this._clockGroup.header_suffix = this._add;
        page.add(this._clockGroup);
    }

    _refreshClocks() {
        for (const row of this._clockRows)
            this._clockGroup.remove(row);
        this._clockRows = [];
        const clocks = readClocks(this._settings);
        this._add.sensitive = clocks.length < MAX_CLOCKS && this._zones.length > 0;
        clocks.forEach((clock, index) => {
            const row = new Adw.ActionRow({title: clock.label || locationName(clock.zone), subtitle: clock.zone, use_markup: false});
            const edit = button('document-edit-symbolic', _('Edit clock'), () => this._edit(index));
            edit.sensitive = this._zones.length > 0;
            const up = button('go-up-symbolic', _('Move up'), () => this._move(index, -1));
            const down = button('go-down-symbolic', _('Move down'), () => this._move(index, 1));
            up.sensitive = index > 0;
            down.sensitive = index < clocks.length - 1;
            row.add_suffix(up);
            row.add_suffix(down);
            row.add_suffix(edit);
            row.activatable_widget = edit;
            this._clockGroup.add(row);
            this._clockRows.push(row);
        });
    }

    _move(index, direction) {
        const clocks = readClocks(this._settings);
        [clocks[index], clocks[index + direction]] = [clocks[index + direction], clocks[index]];
        writeClocks(this._settings, clocks);
    }

    _edit(index) {
        const snapshot = this._settings.get_string('clocks');
        const clocks = readClocks(this._settings);
        const record = index < 0 ? {zone: 'UTC', label: '', color: '', showAbbr: true} : clocks[index];
        const dialog = new Adw.Window({title: index < 0 ? _('Add clock') : _('Edit clock'), transient_for: this._window, modal: true, default_width: 580});
        this._dialog = dialog;
        const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
        box.append(new Adw.HeaderBar());
        const group = new Adw.PreferencesGroup({margin_start: 20, margin_end: 20, margin_top: 16, margin_bottom: 20});
        box.append(group);
        const zone = new Gtk.DropDown({model: Gtk.StringList.new(this._zones), enable_search: true, search_match_mode: Gtk.StringFilterMatchMode.SUBSTRING});
        zone.selected = Math.max(0, this._zones.indexOf(record.zone));
        group.add(action(_('Time zone'), zone));
        const description = new Gtk.Entry({text: record.label, max_length: 60, placeholder_text: locationName(record.zone)});
        group.add(action(_('Description (optional)'), description));
        zone.connect('notify::selected', () => {
            description.placeholder_text = locationName(this._zones[zone.selected]);
        });
        const abbreviations = new Adw.SwitchRow({title: _('Show time zone abbreviation'), active: record.showAbbr});
        if (!this._settings.get_boolean('show-abbreviations'))
            abbreviations.subtitle = _('Currently hidden by the global Appearance setting.');
        group.add(abbreviations);
        const inherit = new Adw.SwitchRow({title: _('Use global font color'), active: !record.color});
        group.add(inherit);
        const color = colorButton(record.color || this._settings.get_string('font-color'));
        color.sensitive = !inherit.active;
        inherit.connect('notify::active', () => {
            color.sensitive = !inherit.active;
        });
        group.add(action(_('This clock’s font color'), color));
        const footer = new Gtk.Box({spacing: 12, halign: Gtk.Align.END, margin_end: 20, margin_bottom: 20});
        const save = new Gtk.Button({label: _('Save clock'), css_classes: ['suggested-action']});
        const commit = remove => {
            if (snapshot !== this._settings.get_string('clocks')) {
                this._toast(_('The clock list changed. Reopen this clock to edit it.'));
                dialog.close();
                return;
            }
            const updated = {zone: this._zones[zone.selected], label: description.text.trim(), showAbbr: abbreviations.active, color: inherit.active ? '' : hex(color.rgba)};
            if (remove)
                clocks.splice(index, 1);
            else if (index < 0)
                clocks.push(updated);
            else
                clocks[index] = updated;
            writeClocks(this._settings, clocks);
            dialog.close();
        };
        if (index >= 0) {
            const remove = new Gtk.Button({label: _('Remove'), css_classes: ['destructive-action']});
            remove.connect('clicked', () => commit(true));
            footer.append(remove);
        }
        const cancel = new Gtk.Button({label: _('Cancel')});
        cancel.connect('clicked', () => dialog.close());
        save.connect('clicked', () => commit(false));
        footer.append(cancel);
        footer.append(save);
        box.append(footer);
        dialog.content = box;
        dialog.connect('close-request', () => {
            this._dialog = null;
            return false;
        });
        dialog.present();
    }

    _switch(group, key, title, subtitle = '') {
        const row = new Adw.SwitchRow({title, subtitle});
        this._settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        this._bindings.push([row, 'active']);
        group.add(row);
        return row;
    }

    _number(group, key, title, lower, upper, subtitle = '') {
        const row = new Adw.SpinRow({title, subtitle, adjustment: new Gtk.Adjustment({lower, upper, step_increment: 1, page_increment: 5})});
        this._settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
        this._bindings.push([row, 'value']);
        group.add(row);
        return row;
    }

    _combo(group, key, title, values, labels) {
        const settings = this._settings;
        const row = new Adw.ComboRow({title, model: Gtk.StringList.new(labels), selected: Math.max(0, values.indexOf(this._settings.get_string(key)))});
        row.connect('notify::selected', () => settings.set_string(key, values[row.selected]));
        group.add(row);
        return row;
    }

    _color(group, key, title) {
        const settings = this._settings;
        const chooser = colorButton(this._settings.get_string(key));
        chooser.connect('notify::rgba', () => settings.set_string(key, hex(chooser.rgba)));
        const row = action(title, chooser);
        group.add(row);
        return row;
    }

    _appearancePage() {
        const page = this._page(_('Appearance'), 'preferences-desktop-appearance-symbolic');
        this._appearance = page;
        const text = new Adw.PreferencesGroup({title: _('Text · Group %s').replace('%s', `${this._groupIndex + 1}`),
            description: _('Settings apply immediately. Individual clock colors override the global color.')});
        page.add(text);
        const font = new Gtk.FontDialogButton({dialog: new Gtk.FontDialog(), level: Gtk.FontLevel.FAMILY, font_desc: Pango.FontDescription.from_string(this._settings.get_string('font-family'))});
        const settings = this._settings;
        font.connect('notify::font-desc', () => settings.set_string('font-family', font.font_desc.get_family()));
        text.add(action(_('Installed font'), font, _('Choose from all fonts available to GNOME.')));
        this._number(text, 'font-size', _('Font size'), 14, 48, _('Logical pixels'));
        this._number(text, 'text-opacity', _('Text opacity'), 0, 100, _('Percent; does not fade the background'));
        this._color(text, 'font-color', _('Global font color'));
        this._switch(text, 'text-shadow', _('Text shadow'));

        const layout = new Adw.PreferencesGroup({title: _('Layout and position')});
        page.add(layout);
        this._combo(layout, 'layout', _('Layout'), LAYOUTS, [_('Inline'), _('Aligned time column'), _('Large time, label above'), _('Two-column grid'), _('Horizontal strip')]);
        this._combo(layout, 'position', _('Desktop corner'), POSITIONS, [_('Top left'), _('Top right'), _('Bottom left'), _('Bottom right')]);
        this._number(layout, 'margin', _('Edge margin'), 0, 200);
        this._number(layout, 'monitor', _('Monitor'), -1, Math.max(0, Gdk.Display.get_default().get_monitors().get_n_items() - 1), _('−1 uses the primary monitor; 0 is the first monitor.'));

        const background = new Adw.PreferencesGroup({title: _('Clock background')});
        page.add(background);
        const mode = this._combo(background, 'background-mode', _('Background'), BACKGROUNDS, [_('Transparent'), _('Solid color'), _('Choose image')]);
        const solid = this._color(background, 'background-color', _('Background color'));
        const image = new Gtk.Button({label: _('Choose image…')});
        image.connect('clicked', () => this._chooseImage());
        this._imageRow = action(_('Background image'), image, this._imageSubtitle());
        background.add(this._imageRow);
        const showBackground = () => {
            solid.visible = mode.selected === 1;
            this._imageRow.visible = mode.selected === 2;
        };
        mode.connect('notify::selected', showBackground);
        showBackground();

        const format = new Adw.PreferencesGroup({title: _('Time display')});
        page.add(format);
        this._switch(format, 'show-abbreviations', _('Enable time zone abbreviations'), _('Each clock can hide its own abbreviation.'));
        this._switch(format, 'use-12-hour', _('Use 12-hour time'));
        this._switch(format, 'show-seconds', _('Show seconds'), _('Updates once per second instead of once per minute.'));
        this._switch(format, 'show-day-difference', _('Show date difference'), _('Relative to the computer’s local date'));
    }

    _imageSubtitle() {
        const path = this._settings.get_string('background-image');
        if (!path)
            return _('PNG, JPG, or WebP; maximum 10 MB');
        return GLib.file_test(path, GLib.FileTest.IS_REGULAR) ? GLib.path_get_basename(path) : _('Image missing. Choose a replacement.');
    }

    _chooseImage() {
        const filter = new Gtk.FileFilter({name: _('Images')});
        for (const type of ['image/png', 'image/jpeg', 'image/webp'])
            filter.add_mime_type(type);
        const filters = new Gio.ListStore({item_type: Gtk.FileFilter});
        filters.append(filter);
        const dialog = new Gtk.FileDialog({title: _('Choose a clock background'), filters});
        const cancellable = this._groupCancellable;
        dialog.open(this._window, cancellable, (source, result) => {
            try {
                const file = source.open_finish(result);
                if (cancellable.is_cancelled())
                    return;
                const path = file.get_path();
                if (!path) {
                    this._toast(_('Choose an image stored on this computer.'));
                    return;
                }
                this._prepareImage(file);
            } catch (error) {
                if (!cancellable.is_cancelled() && !error.matches(Gtk.DialogError, Gtk.DialogError.DISMISSED))
                    this._toast(error.message);
            }
        });
    }

    _prepareImage(file) {
        this._imageCancellable?.cancel();
        const cancellable = new Gio.Cancellable();
        this._imageCancellable = cancellable;
        return loadImage(file, cancellable).then(pixbuf => {
            if (!cancellable.is_cancelled())
                this._saveImage(pixbuf);
        }).catch(error => {
            if (!cancellable.is_cancelled())
                this._toast(error.message);
        });
    }

    _saveImage(pixbuf) {
        const directory = GLib.build_filenamev([GLib.get_user_data_dir(), 'desktop-world-clocks']);
        GLib.mkdir_with_parents(directory, 0o700);
        // Unique URI avoids stale textures; remove only the previous managed copy.
        const previous = this._settings.get_string('background-image');
        const basename = `background-${GLib.uuid_string_random()}.png`;
        const path = GLib.build_filenamev([directory, basename]);
        try {
            pixbuf.savev(path, 'png', [], []);
            this._settings.set_string('background-image', path);
            this._imageRow.subtitle = basename;
            if (managedImagePath(previous) && !this._allSettings.some(settings => settings.get_string('background-image') === previous)) {
                Gio.File.new_for_path(previous).delete_async(GLib.PRIORITY_DEFAULT, null, (file, result) => {
                    try {
                        file.delete_finish(result);
                    } catch (error) {
                        if (!error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
                            console.warn(`Could not remove the previous clock background: ${error.message}`);
                    }
                });
            }
        } catch (error) {
            this._toast(error.message);
        }
    }

    _timePage() {
        const page = this._page(_('Time sync'), 'network-server-symbolic');
        this._time = page;
        const group = new Adw.PreferencesGroup({title: _('System time service'), description: _('All clocks use the computer’s time. The extension does not run an NTP client or background helper.')});
        page.add(group);
        this._syncRow = new Adw.ActionRow({title: _('Synchronization status'), subtitle: _('Not checked'), use_markup: false});
        group.add(this._syncRow);
        const refresh = new Gtk.Button({label: _('Refresh status')});
        refresh.connect('clicked', () => this._refreshTime());
        group.add(action(_('Check current system status'), refresh));
        const settings = new Gtk.Button({label: _('Open Date & Time')});
        settings.connect('clicked', () => {
            try {
                const app = GioUnix.DesktopAppInfo.new('gnome-datetime-panel.desktop');
                if (!app)
                    throw new Error(_('GNOME Date & Time settings are not installed.'));
                app.launch([], null);
            } catch (error) {
                this._toast(error.message);
            }
        });
        group.add(action(_('Manage automatic time'), settings, _('NTP server selection is managed by the operating system or administrator.')));
        this._refreshTime();
    }

    _refreshTime() {
        this._syncRow.subtitle = _('Checking…');
        Gio.DBus.system.call('org.freedesktop.timedate1', '/org/freedesktop/timedate1', 'org.freedesktop.DBus.Properties', 'GetAll',
            new GLib.Variant('(s)', ['org.freedesktop.timedate1']), new GLib.VariantType('(a{sv})'), Gio.DBusCallFlags.NONE, 5000, this._cancellable,
            (connection, result) => {
                try {
                    const [properties] = connection.call_finish(result).deep_unpack();
                    if (this._cancellable.is_cancelled())
                        return;
                    const synchronized = properties.NTPSynchronized?.deep_unpack();
                    const enabled = properties.NTP?.deep_unpack();
                    const status = synchronized === true ? _('Synchronized') : enabled === false ? _('Automatic time disabled')
                        : synchronized === false ? _('Not synchronized') : _('Status unavailable');
                    this._syncRow.subtitle = `${status} · ${GLib.DateTime.new_now_local().format('%H:%M:%S')}`;
                } catch {
                    if (!this._cancellable.is_cancelled())
                        this._syncRow.subtitle = _('Status unavailable. Check your system time service.');
                }
            });
    }
}
