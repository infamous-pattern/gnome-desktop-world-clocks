// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';

export function loadZones(cancellable) {
    return new Promise((resolve, reject) => {
        Gio.File.new_for_path('/usr/share/zoneinfo/tzdata.zi').load_contents_async(cancellable, (file, result) => {
            try {
                const [, bytes] = file.load_contents_finish(result);
                const zones = new Set(['UTC']);
                for (const line of new TextDecoder().decode(bytes).split('\n')) {
                    const fields = line.trim().split(/\s+/);
                    if (fields[0] === 'Z' || fields[0] === 'Zone')
                        zones.add(fields[1]);
                    else if (fields[0] === 'L' || fields[0] === 'Link')
                        zones.add(fields[2]);
                }
                resolve([...zones].sort());
            } catch (error) {
                reject(error);
            }
        });
    });
}
