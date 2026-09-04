// SPDX-License-Identifier: GPL-2.0-or-later
// Generated with AI for personal use.
// Do NOT upload to extensions.gnome.org (EGO) unless you understand JavaScript
// and can maintain this code.
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const MAX_BYTES = 10 * 1024 * 1024;

function readChunk(stream, count, cancellable) {
    return new Promise((resolve, reject) => {
        stream.read_bytes_async(count, GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
            try {
                resolve(source.read_bytes_finish(result));
            } catch (error) {
                reject(error);
            }
        });
    });
}

function closeStream(stream) {
    return new Promise((resolve, reject) => {
        stream.close_async(GLib.PRIORITY_DEFAULT, null, (source, result) => {
            try {
                resolve(source.close_finish(result));
            } catch (error) {
                reject(error);
            }
        });
    });
}

export async function loadImage(file, cancellable) {
    if (!file.is_native())
        throw new Error(_('Choose an image stored on this computer.'));
    const info = await new Promise((resolve, reject) => {
        file.query_info_async('standard::type,standard::size', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
            GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
                try {
                    resolve(source.query_info_finish(result));
                } catch (error) {
                    reject(error);
                }
            });
    });
    if (info.get_file_type() !== Gio.FileType.REGULAR || info.get_size() > MAX_BYTES)
        throw new Error(_('Choose a regular PNG, JPG, or WebP file no larger than 10 MB.'));

    const stream = await new Promise((resolve, reject) => {
        file.read_async(GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
            try {
                resolve(source.read_finish(result));
            } catch (error) {
                reject(error);
            }
        });
    });
    let bytes;
    try {
        const chunks = [];
        let length = 0;
        while (true) {
            const chunk = (await readChunk(stream, Math.min(65536, MAX_BYTES + 1 - length), cancellable)).get_data();
            if (chunk.length === 0)
                break;
            length += chunk.length;
            if (length > MAX_BYTES)
                throw new Error(_('The image exceeds the 10 MB limit.'));
            chunks.push(chunk);
        }
        bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
    } finally {
        await closeStream(stream);
    }
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
        String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
    if (!png && !jpeg && !webp)
        throw new Error(_('The file does not contain a PNG, JPG, or WebP image.'));
    // Decode the bounded snapshot, even if the original file changes after selection.
    const memory = Gio.MemoryInputStream.new_from_bytes(new GLib.Bytes(bytes));
    try {
        return await new Promise((resolve, reject) => {
            GdkPixbuf.Pixbuf.new_from_stream_at_scale_async(memory, 2048, 2048, true, cancellable, (_source, result) => {
                try {
                    resolve(GdkPixbuf.Pixbuf.new_from_stream_finish(result));
                } catch (error) {
                    reject(error);
                }
            });
        });
    } finally {
        await closeStream(memory);
    }
}
