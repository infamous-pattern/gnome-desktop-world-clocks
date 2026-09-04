// SPDX-License-Identifier: GPL-2.0-or-later
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {ClockController} from './shell/controller.js';

export default class DesktopWorldClocks extends Extension {
    enable() {
        this._controller = new ClockController(this.getSettings());
        this._controller.start();
    }

    disable() {
        this._controller.destroy();
        this._controller = null;
    }
}
