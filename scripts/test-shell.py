#!/usr/bin/env python3
"""Exercise the extension in a disposable, software-rendered GNOME session."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import time
import tempfile
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--core-only', action='store_true', help='Diagnostic partial run without image loading or screenshots; not full compatibility validation')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
subprocess.run(["python3", str(root / "scripts/package.py")], check=True, cwd=root)
uuid = json.loads((root / "metadata.json").read_text())["uuid"]
results = root / "test-results"
results.mkdir(exist_ok=True)
version = subprocess.check_output(['gnome-shell', '--version'], text=True).strip()
(results / 'version.txt').write_text(version + '\n')
print(version, flush=True)
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
        "WORLD_CLOCK_CORE_ONLY": "1" if args.core_only else "0",
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
        process = subprocess.Popen([
            "dbus-run-session", "--", "gnome-shell", "--headless",
            "--virtual-monitor", "1280x720", "--wayland-display", "world-clocks-test",
            "--automation-script", str(root / "tests/shell.js"),
        ], env=env, cwd=root, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            returncode = process.wait(timeout=90)
        finally:
            # Bus-activated services may briefly outlive Shell and still write metadata.
            # This group belongs only to the disposable test session.
            for termination in [signal.SIGTERM, signal.SIGKILL]:
                try:
                    os.killpg(process.pid, termination)
                except ProcessLookupError:
                    break
                time.sleep(0.1)
            process.wait(timeout=5)
    output = (results / "shell.log").read_text()
    for line in output.splitlines():
        if any(marker in line for marker in ["PASS:", "Script failed", "JS ERROR", "test failed"]):
            print(line)
    if "Ignoring length property that isn't a number" in output:
        print("Extension CSS produced an invalid length warning")
        raise SystemExit(1)
    print(f"Isolated GNOME test exit status: {returncode}")
    raise SystemExit(returncode)
