// SPDX-License-Identifier: GPL-2.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function row(group, title, subtitle, link = null) {
    const item = new Adw.ActionRow({title, subtitle, use_markup: false});
    if (link) {
        const button = new Gtk.LinkButton({label: link.label, uri: link.uri, valign: Gtk.Align.CENTER});
        item.add_suffix(button);
        item.activatable_widget = button;
    }
    group.add(item);
}

export function aboutPage(metadata) {
    const page = new Adw.PreferencesPage({title: _('About'), icon_name: 'help-about-symbolic'});
    const repository = metadata.url;
    const project = new Adw.PreferencesGroup({title: metadata.name,
        description: _('Up to four independent desktop clock groups, with ten world clocks per group.')});
    page.add(project);
    const version = metadata['version-name'] || (metadata.version ? String(metadata.version) : _('Development build'));
    row(project, _('Version'), version);
    row(project, _('GNOME Shell targets'), metadata['shell-version'].join(', '));

    const license = new Adw.PreferencesGroup({title: _('License')});
    page.add(license);
    row(license, _('GNU General Public License v2.0 or later'), 'GPL-2.0-or-later',
        {label: _('Read license'), uri: `${repository}/blob/main/LICENSE`});

    const links = new Adw.PreferencesGroup({title: _('Project and support')});
    page.add(links);
    row(links, _('GitHub repository'), _('Source code, documentation, and compatibility details'),
        {label: _('Open GitHub'), uri: repository});
    row(links, _('Issues and feedback'), _('Report a problem or suggest an improvement'),
        {label: _('View issues'), uri: `${repository}/issues`});

    const operation = new Adw.PreferencesGroup({title: _('Time and privacy'),
        description: _('Uses your system clock and operating system time synchronization. All groups share one update timer. No usage data is collected or uploaded.')});
    page.add(operation);
    return page;
}
