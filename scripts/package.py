#!/usr/bin/env python3
"""Build only the runtime files, without the browser mockup or development tools."""
import argparse
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--submission', action='store_true', help='Require manually reviewed source without AI notices; write to dist/submission')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
subprocess.run(["glib-compile-schemas", "--strict", str(root / "schemas")], check=True)
metadata = json.loads((root / "metadata.json").read_text())
uuid = metadata["uuid"]
assert re.fullmatch(r"[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+", uuid), "Invalid UUID"
assert not uuid.endswith("@gnome.org"), "Reserved UUID namespace"
assert "version" not in metadata and "session-modes" not in metadata, "Unnecessary metadata keys"
schema_id = metadata['settings-schema']
assert schema_id.startswith('org.gnome.shell.extensions.'), "Invalid schema namespace"
schema_path = f'schemas/{schema_id}.gschema.xml'
schema = ET.parse(root / schema_path).getroot().find('schema')
assert schema.get('id') == schema_id and schema.get('path').startswith('/org/gnome/shell/extensions/'), "Invalid schema identity"
names = [
    "metadata.json", "extension.js", "prefs.js", "LICENSE",
    "shared/model.js", "shell/controller.js", "prefs/window.js", "prefs/zones.js", "prefs/images.js",
    schema_path, "schemas/gschemas.compiled",
]
paths = [root / name for name in names]
for path in paths:
    assert path.is_file() and not path.is_symlink(), f"Missing or symlinked runtime file: {path}"
    if path.suffix == '.js':
        text = path.read_text()
        assert max(map(len, text.splitlines()), default=0) <= 200, f"Line longer than 200 characters: {path}"
        if args.submission and 'Generated with AI for personal use.' in text:
            parser.error('Submission blocked: the maintainer must review the source and manually remove the AI notices first.')
directory = root / 'dist' / ('submission' if args.submission else '')
destination = directory / f"{uuid}.shell-extension.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(paths):
        archive.write(path, path.relative_to(root))
print(destination)
