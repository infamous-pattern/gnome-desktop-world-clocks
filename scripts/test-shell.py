#!/usr/bin/env python3
"""Exercise the extension in a disposable, software-rendered GNOME session."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
subprocess.run(["python3", str(root / "scripts/package.py")], check=True, cwd=root)
uuid = json.loads((root / "metadata.json").read_text())["uuid"]
results = root / "test-results"
results.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="world-clocks-test-") as temporary:
    base = Path(temporary)
    env = dict(os.environ)
    for key in ["DISPLAY", "XAUTHORITY", "DBUS_SESSION_BUS_ADDRESS"]:
        env.pop(key, None)
    for kind in ["CACHE", "CONFIG", "DATA", "RUNTIME"]:
        directory = base / kind.lower()
        directory.mkdir(mode=0o700)
        env[f"XDG_{kind}_HOME" if kind != "RUNTIME" else "XDG_RUNTIME_DIR"] = str(directory)
    env.update({
        "GSETTINGS_BACKEND": "keyfile",
        "LIBGL_ALWAYS_SOFTWARE": "1",
        "GSK_RENDERER": "cairo",
        "GI_TYPELIB_PATH": ":".join(filter(None, [
            "/usr/lib64/gnome-shell/girepository-1.0",
            "/usr/lib/gnome-shell/girepository-1.0",
            os.environ.get("GI_TYPELIB_PATH"),
        ])),
        "WORLD_CLOCK_TEST_ROOT": str(root),
    })
    target = base / "data/gnome-shell/extensions" / uuid
    target.mkdir(parents=True)
    with zipfile.ZipFile(root / "dist" / f"{uuid}.shell-extension.zip") as archive:
        archive.extractall(target)
    configuration = base / "config/glib-2.0/settings"
    configuration.mkdir(parents=True)
    (configuration / "keyfile").write_text(
        f'[org/gnome/shell]\nenabled-extensions=["{uuid}"]\n'
        '[org/gnome/desktop/interface]\nenable-animations=false\n'
    )
    with (results / "shell.log").open("w") as log:
        result = subprocess.run([
            "dbus-run-session", "--", "gnome-shell", "--headless",
            "--virtual-monitor", "1280x720", "--wayland-display", "world-clocks-test",
            "--automation-script", str(root / "tests/shell.js"),
        ], env=env, cwd=root, stdout=log, stderr=subprocess.STDOUT, timeout=90)
    for line in (results / "shell.log").read_text().splitlines():
        if any(marker in line for marker in ["PASS:", "Script failed", "JS ERROR", "test failed"]):
            print(line)
    print(f"Isolated GNOME test exit status: {result.returncode}")
    raise SystemExit(result.returncode)
