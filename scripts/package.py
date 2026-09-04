#!/usr/bin/env python3
"""Build only the runtime files, without the browser mockup or development tools."""
import json
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
subprocess.run(["glib-compile-schemas", "--strict", str(root / "schemas")], check=True)
uuid = json.loads((root / "metadata.json").read_text())["uuid"]
destination = root / "dist" / f"{uuid}.shell-extension.zip"
destination.parent.mkdir(exist_ok=True)
paths = [root / name for name in ["metadata.json", "extension.js", "prefs.js", "LICENSE"]]
for directory in ["shared", "shell", "prefs", "schemas"]:
    paths.extend(p for p in (root / directory).rglob("*") if p.is_file())
with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(paths):
        archive.write(path, path.relative_to(root))
print(destination)
