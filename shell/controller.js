// SPDX-License-Identifier: GPL-2.0-or-later
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ngettext} from 'resource:///org/gnome/shell/extensions/extension.js';
import {boundaryDelay, clockText, cssString, LAYOUTS, managedImagePath, readClocks, validColor} from '../shared/model.js';

export class ClockController {
    constructor(settings) {
        this._settings = settings;
        this._signals = [];
        this._timerId = 0;
        this._sleeping = false;
        this._items = [];
        this._actor = null;
    }

    start() {
        this._actor = new St.Bin({name: 'desktop-world-clocks', reactive: false, can_focus: false});
        // Isolate this private Shell integration point; source-reviewed against the targeted layout.js versions.
        Main.layoutManager._backgroundGroup.add_child(this._actor);
        this._connect(this._settings, 'changed', () => this._configure());
        this._connect(Main.layoutManager, 'monitors-changed', () => this._configure());
        this._connect(global.display, 'workareas-changed', () => this._configure());
        this._connect(global.display, 'in-fullscreen-changed', () => this._syncVisibility());
        this._connect(Main.overview, 'showing', () => this._syncVisibility());
        this._connect(Main.overview, 'hidden', () => this._syncVisibility());
        this._connect(this._actor, 'notify::mapped', () => this._syncTimer());
        this._sleepSubscription = Gio.DBus.system.signal_subscribe(
            'org.freedesktop.login1', 'org.freedesktop.login1.Manager', 'PrepareForSleep',
            '/org/freedesktop/login1', null, Gio.DBusSignalFlags.NONE,
            (_bus, _sender, _path, _iface, _signal, parameters) => {
                [this._sleeping] = parameters.deep_unpack();
                this._syncVisibility();
            });
        this._configure();
    }

    destroy() {
        this._stopTimer();
        for (const [object, id] of this._signals)
            object.disconnect(id);
        this._signals = [];
        if (this._sleepSubscription) {
            Gio.DBus.system.signal_unsubscribe(this._sleepSubscription);
            this._sleepSubscription = 0;
        }
        this._items = [];
        this._actor.destroy();
        this._actor = null;
        this._content = null;
        this._settings = null;
    }

    _connect(object, signal, callback) {
        this._signals.push([object, object.connect(signal, callback)]);
    }

    _configure() {
        this._stopTimer();
        const requested = this._settings.get_int('monitor');
        this._monitor = Main.layoutManager.monitors[requested] ?? Main.layoutManager.primaryMonitor;
        if (!this._monitor) {
            this._actor.hide();
            return;
        }

        this._options = {
            seconds: this._settings.get_boolean('show-seconds'),
            abbreviations: this._settings.get_boolean('show-abbreviations'),
            dayDifference: this._settings.get_boolean('show-day-difference'),
            twelveHour: this._settings.get_boolean('use-12-hour'),
        };
        const requestedLayout = this._settings.get_string('layout');
        this._layout = LAYOUTS.includes(requestedLayout) ? requestedLayout : 'classic';
        const size = this._settings.get_int('font-size');
        this._scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        const area = Main.layoutManager.getWorkAreaForMonitor(this._monitor.index);
        this._area = area;
        this._margin = Math.min(this._settings.get_int('margin') * this._scale, area.width / 4, area.height / 4);
        const available = Math.max(1, area.width - this._margin * 2);
        const mode = this._settings.get_string('background-mode');
        this._padding = mode === 'transparent' ? 0 : 16;
        const usable = Math.max(1, available - this._padding * 2 * this._scale);
        const columns = this._layout === 'grid' ? Math.min(2, Math.max(1, Math.floor(usable / (size * this._scale * 11))))
            : this._layout === 'strip' ? Math.max(1, Math.min(10, Math.floor(usable / (size * this._scale * 9)))) : 1;

        this._actor.get_child()?.destroy();
        const grid = new Clutter.GridLayout({column_spacing: 24 * this._scale, row_spacing: 10 * this._scale});
        this._content = new St.Widget({layout_manager: grid, reactive: false});
        this._content.opacity = Math.round(this._settings.get_int('text-opacity') * 2.55);
        this._actor.set_child(this._content);
        const font = cssString(this._settings.get_string('font-family').slice(0, 256));
        const shadow = this._settings.get_boolean('text-shadow') ? 'text-shadow: 0px 2px 4px rgba(0,0,0,0.8);' : '';
        this._content.set_style(`font-family: ${font}; font-size: ${size}px; ${shadow}`);
        this._actor.set_style(this._backgroundStyle(mode));
        this._items = [];

        const globalColor = validColor(this._settings.get_string('font-color'), '#ffffff');
        for (const record of readClocks(this._settings)) {
            const zone = GLib.TimeZone.new_identifier(record.zone);
            if (!zone)
                continue;
            const index = this._items.length;
            const cell = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, reactive: false});
            cell.set_style(`color: ${record.color || globalColor};`);
            const width = Math.max(1, (usable - 24 * this._scale * (columns - 1)) / columns);
            const name = this._label();
            const time = this._label();
            const day = this._label();
            day.set_style(`font-size: ${Math.max(11, Math.round(size * 0.5))}px;`);
            const item = {record, zone, name, time, day, cell};
            if (this._layout === 'classic') {
                cell.add_child(name);
                time.destroy();
                item.time = null;
            } else if (this._layout === 'aligned') {
                name.set_style(`color: ${record.color || globalColor};`);
                name.set_width(Math.min(width * 0.6, size * this._scale * 16));
                grid.attach(name, 0, index, 1, 1);
                time.x_align = Clutter.ActorAlign.END;
                day.x_align = Clutter.ActorAlign.END;
                cell.add_child(time);
            } else {
                name.set_style(`font-size: ${Math.max(11, Math.round(size * 0.65))}px;`);
                if (this._layout === 'grid') {
                    cell.add_child(time);
                    cell.add_child(name);
                } else {
                    cell.add_child(name);
                    cell.add_child(time);
                }
                if (this._layout === 'stacked')
                    time.set_style(`font-size: ${Math.round(size * 1.35)}px;`);
            }
            cell.add_child(day);
            if (['grid', 'strip'].includes(this._layout))
                cell.set_width(Math.min(width, size * this._scale * 12));
            else
                cell.set_style(`${cell.get_style()} max-width: ${width / this._scale}px;`);
            grid.attach(cell, this._layout === 'aligned' ? 1 : index % columns, Math.floor(index / columns), 1, 1);
            this._items.push(item);
        }
        this._update();
        this._syncVisibility();
    }

    _label() {
        const label = new St.Label({reactive: false});
        label.clutter_text.line_wrap = true;
        label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        return label;
    }

    _backgroundStyle(mode) {
        const base = `padding: ${this._padding}px; border-radius: 12px;`;
        if (mode === 'solid')
            return `${base} background-color: ${validColor(this._settings.get_string('background-color'), '#172a24')};`;
        const path = this._settings.get_string('background-image');
        if (mode === 'image' && managedImagePath(path)) {
            const uri = Gio.File.new_for_path(path).get_uri();
            return `${base} background-image: url(${cssString(uri)}); background-size: cover; background-position: center;`;
        }
        return base;
    }

    _update() {
        const now = GLib.DateTime.new_now_local();
        for (const item of this._items) {
            const text = clockText(item.record, item.zone, now, this._options);
            this._setText(item.name, this._layout === 'classic' ? `${text.name} – ${text.time}` : text.name);
            if (item.time)
                this._setText(item.time, text.time);
            const day = text.difference
                ? ngettext('%s day', '%s days', Math.abs(text.difference)).replace('%s', `${text.difference > 0 ? '+' : ''}${text.difference}`) : '';
            this._setText(item.day, day);
            item.day.visible = Boolean(day);
        }
        this._position();
    }

    _setText(label, text) {
        if (label.text !== text)
            label.set_text(text);
    }

    _position() {
        const [, width] = this._actor.get_preferred_width(-1);
        const [, height] = this._actor.get_preferred_height(width);
        const corner = this._settings.get_string('position');
        const {x, y, width: areaWidth, height: areaHeight} = this._area;
        const fit = Math.min(1, (areaWidth - this._margin * 2) / Math.max(1, width), (areaHeight - this._margin * 2) / Math.max(1, height));
        this._actor.set_scale(fit, fit);
        this._actor.set_position(
            x + (corner.endsWith('right') ? Math.max(this._margin, areaWidth - width * fit - this._margin) : this._margin),
            y + (corner.startsWith('bottom') ? Math.max(this._margin, areaHeight - height * fit - this._margin) : this._margin));
        this._actor.remove_clip();
    }

    _syncVisibility() {
        this._actor.visible = Boolean(this._monitor && this._items.length && !this._sleeping &&
            !Main.overview.visible && !global.display.get_monitor_in_fullscreen(this._monitor.index));
        this._syncTimer();
    }

    _syncTimer() {
        this._stopTimer();
        if (!this._actor.mapped || !this._actor.visible || this._sleeping || !this._items.length)
            return;
        this._update();
        this._schedule();
    }

    _schedule() {
        this._stopTimer();
        const delay = boundaryDelay(GLib.get_real_time() / 1000, this._options.seconds);
        this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            this._timerId = 0;
            this._update();
            this._schedule();
            return GLib.SOURCE_REMOVE;
        });
    }

    _stopTimer() {
        if (this._timerId) {
            GLib.Source.remove(this._timerId);
            this._timerId = 0;
        }
    }
}
