#!/usr/bin/env python3
"""Check notices, locked dependency metadata and every versioned binary asset."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SUFFIXES = {".png", ".jpg", ".jpeg", ".ico", ".ttf", ".woff2", ".cer", ".bbmodel", ".jar"}


def verify(root=ROOT):
    errors = []
    for name, marker in {"LICENSE": "Permission is hereby granted, free of charge",
                         "licenses/Apache-2.0.txt": "Apache License",
                         "THIRD_PARTY_NOTICES.md": "Minecraft",
                         "src/client/resources/FONTS-LICENSE.txt": "SIL OPEN FONT LICENSE",
                         "src/client/resources/ICONS-LICENSE.txt": "ISC License",
                         "launcher/src/assets/fonts/OFL.txt": "SIL OPEN FONT LICENSE"}.items():
        path = root / name
        if not path.is_file() or marker not in path.read_text(encoding="utf-8"):
            errors.append(f"Missing or invalid notice: {name}")
    package = json.loads((root / "launcher/package.json").read_text(encoding="utf-8"))
    if package.get("license") != "MIT":
        errors.append("Launcher source must declare MIT")
    lock = json.loads((root / "launcher/package-lock.json").read_text(encoding="utf-8"))
    for name, entry in lock["packages"].items():
        license_id = str(entry.get("license", "")).strip()
        if not license_id or license_id.upper() in {"UNLICENSED", "UNKNOWN", "NONE", "NOASSERTION"}:
            errors.append(f"Review dependency license: {name or '<root>'}")
    inventory = json.loads((root / "assets/licenses.json").read_text(encoding="utf-8"))
    paths = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=root, text=True).splitlines()
    assets = {name for name in paths if (root / name).is_file() and Path(name).suffix.lower() in SUFFIXES}
    if assets != set(inventory):
        errors.append(f"Asset inventory mismatch: {sorted(assets ^ set(inventory))}")
    for name, entry in inventory.items():
        path = root / name
        if not entry.get("license") or not entry.get("source") or not entry.get("notice"):
            errors.append(f"Incomplete asset provenance: {name}")
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != entry.get("sha256"):
            errors.append(f"Asset changed; review provenance and update inventory: {name}")
        if not (root / entry.get("notice", "")).is_file():
            errors.append(f"Missing asset notice: {name}")
    for error in errors:
        print("ERROR:", error)
    print(f"License validation: {len(lock['packages'])} locked packages, {len(assets)} assets, {len(errors)} errors")
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(verify())
