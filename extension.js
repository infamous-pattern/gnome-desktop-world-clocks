// SPDX-License-Identifier: GPL-2.0-or-later

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
