// SPDX-License-Identifier: GPL-2.0-or-later

export const MAX_GROUPS = 4;

export const GROUP_KEYS = Object.freeze([
    'clocks',
    'font-family',
    'font-size',
    'text-opacity',
    'font-color',
    'layout',
    'position',
    'monitor',
    'margin',
    'show-abbreviations',
    'show-seconds',
    'show-day-difference',
    'use-12-hour',
    'text-shadow',
    'background-mode',
    'background-color',
    'background-image',
]);

const GROUP_KEY_SET = new Set(GROUP_KEYS);

class GroupSettings {
    constructor(settings, index) {
        this._settings = settings;
        this._prefix = index === 0 ? '' : `group${index + 1}-`;
    }

    _key(key) {
        if (!GROUP_KEY_SET.has(key))
            throw new RangeError('Invalid clock group setting');
        return `${this._prefix}${key}`;
    }

    get_string(key) {
        return this._settings.get_string(this._key(key));
    }

    set_string(key, value) {
        return this._settings.set_string(this._key(key), value);
    }

    get_int(key) {
        return this._settings.get_int(this._key(key));
    }

    set_int(key, value) {
        return this._settings.set_int(this._key(key), value);
    }

    get_boolean(key) {
        return this._settings.get_boolean(this._key(key));
    }

    set_boolean(key, value) {
        return this._settings.set_boolean(this._key(key), value);
    }

    reset(key) {
        return this._settings.reset(this._key(key));
    }

    bind(key, object, property, flags) {
        return this._settings.bind(this._key(key), object, property, flags);
    }

    connect(signal, callback) {
        if (signal === 'changed') {
            return this._settings.connect(signal, (_settings, key) => {
                if (this._prefix && key.startsWith(this._prefix))
                    callback(this, key.slice(this._prefix.length));
                else if (!this._prefix && GROUP_KEY_SET.has(key))
                    callback(this, key);
            });
        }
        if (signal.startsWith('changed::')) {
            const key = signal.slice('changed::'.length);
            return this._settings.connect(`changed::${this._key(key)}`, () => callback(this, key));
        }
        throw new RangeError('Unsupported clock group signal');
    }

    disconnect(id) {
        this._settings.disconnect(id);
    }
}

export function groupSettings(settings, index) {
    if (!Number.isInteger(index) || index < 0 || index >= MAX_GROUPS)
        throw new RangeError('Invalid clock group');
    return new GroupSettings(settings, index);
}
