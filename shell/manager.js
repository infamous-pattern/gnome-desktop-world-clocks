// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {boundaryDelay} from '../shared/model.js';
import {groupSettings, MAX_GROUPS} from '../shared/groups.js';
import {ClockController} from './controller.js';

export class ClockManager {
    constructor(settings) {
        this._settings = settings;
        this._groups = [];
        this._signals = [];
        this._timerId = 0;
        this._sleeping = false;
        this._changing = false;
    }

    start() {
        this._connect(this._settings, 'changed::group-count', () => this._configureGroups());
        this._connect(Main.layoutManager, 'monitors-changed', () => this._refreshGroups(true));
        this._connect(global.display, 'workareas-changed', () => this._refreshGroups(true));
        this._connect(global.display, 'in-fullscreen-changed', () => this._refreshGroups());
        this._connect(Main.overview, 'showing', () => this._refreshGroups());
        this._connect(Main.overview, 'hidden', () => this._refreshGroups());
        this._sleepSubscription = Gio.DBus.system.signal_subscribe(
            'org.freedesktop.login1', 'org.freedesktop.login1.Manager', 'PrepareForSleep',
            '/org/freedesktop/login1', null, Gio.DBusSignalFlags.NONE,
            (_bus, _sender, _path, _iface, _signal, parameters) => {
                [this._sleeping] = parameters.deep_unpack();
                this._refreshGroups();
            });
        this._configureGroups();
    }

    _connect(object, signal, callback) {
        this._signals.push([object, object.connect(signal, callback)]);
    }

    _configureGroups() {
        this._changing = true;
        this._stopTimer();
        const count = Math.max(1, Math.min(MAX_GROUPS, this._settings.get_int('group-count')));
        while (this._groups.length > count)
            this._groups.pop().destroy();
        while (this._groups.length < count) {
            const group = new ClockController(groupSettings(this._settings, this._groups.length), this);
            this._groups.push(group);
            group.start();
        }
        this._changing = false;
        this._syncTimer();
    }

    _refreshGroups(configure = false) {
        this._changing = true;
        for (const group of this._groups) {
            if (configure)
                group._configure();
            else
                group._syncVisibility();
        }
        this._changing = false;
        this._syncTimer();
    }

    _visibleGroups() {
        return this._sleeping ? [] : this._groups.filter(group => group._actor?.mapped && group._actor.visible && group._items.length);
    }

    _syncTimer() {
        if (this._changing)
            return;
        this._stopTimer();
        const now = GLib.DateTime.new_now_local();
        for (const group of this._visibleGroups())
            group._update(now);
        this._schedule();
    }

    _schedule() {
        this._stopTimer();
        const visible = this._visibleGroups();
        if (!visible.length)
            return;
        const delay = boundaryDelay(GLib.get_real_time() / 1000, visible.some(group => group._options.seconds));
        this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            this._timerId = 0;
            const now = GLib.DateTime.new_now_local();
            const minute = Math.floor(now.to_unix() / 60);
            for (const group of this._visibleGroups()) {
                if (group._options.seconds || group._lastMinute !== minute)
                    group._update(now);
            }
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

    destroy() {
        this._changing = true;
        this._stopTimer();
        for (const [object, id] of this._signals)
            object.disconnect(id);
        this._signals = [];
        if (this._sleepSubscription) {
            Gio.DBus.system.signal_unsubscribe(this._sleepSubscription);
            this._sleepSubscription = 0;
        }
        for (const group of this._groups)
            group.destroy();
        this._groups = [];
        this._settings = null;
    }
}
