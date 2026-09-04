// SPDX-License-Identifier: GPL-2.0-or-later
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {ClockManager} from './shell/manager.js';

export default class DesktopWorldClocks extends Extension {
    enable() {
        this._manager = new ClockManager(this.getSettings());
        this._manager.start();
    }

    disable() {
        this._manager.destroy();
        this._manager = null;
    }
}
