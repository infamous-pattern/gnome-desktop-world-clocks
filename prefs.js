// SPDX-License-Identifier: GPL-2.0-or-later

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {Preferences} from './prefs/window.js';

export default class WorldClockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(660, 740);
        const preferences = new Preferences(window, this.getSettings(), this.metadata);
        preferences.build();
        window.connect('close-request', () => {
            preferences.close();
            return false;
        });
    }
}
