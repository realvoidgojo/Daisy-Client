#!/usr/bin/env python3
"""Coordinate client and Electron versions before committing and tagging a release."""
import argparse
import json
import re
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from versioning import VERSION, version_key

ROOT = Path(__file__).resolve().parents[1]


def prepare(root, version, launcher_version):
    if not VERSION.fullmatch(version) or not re.fullmatch(r"\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?", launcher_version):
        raise ValueError("Use a numeric client version and a three-part Electron version")
    package_path = root / "launcher/package.json"
    package = json.loads(package_path.read_text(encoding="utf-8"))
    old = package["daisyVersion"]
    numbers = version_key
    if numbers(version) <= numbers(old) or numbers(launcher_version) <= numbers(package["version"]):
        raise ValueError("Both release versions must increase")
    lock_path = root / "launcher/package-lock.json"
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    if lock["version"] != package["version"] or lock["packages"][""]["version"] != package["version"]:
        raise ValueError("Existing npm package and lock versions disagree")
    gradle_path = root / "build.gradle.kts"
    gradle = gradle_path.read_text(encoding="utf-8")
    declaration = f'version = "{old}+$minecraftVersion"'
    if gradle.count(declaration) != 1:
        raise ValueError("Existing Gradle and client versions disagree")
    config_path = root / "launcher/src/config/build-version.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if config["version"] != old:
        raise ValueError("Existing build metadata and client versions disagree")
    package.update(version=launcher_version, daisyVersion=version)
    lock["version"] = lock["packages"][""]["version"] = launcher_version
    config["version"] = version
    config["channel"] = "beta" if "-" in version else "stable"
    config.pop("builtAt", None)
    json_text = lambda value: json.dumps(value, indent=2, ensure_ascii=False) + "\n"
    bootstrap_path = root / "daisy-bootstrap/build.gradle.kts"
    changes = {}
    if bootstrap_path.exists():
        bootstrap = bootstrap_path.read_text(encoding="utf-8")
        changes[bootstrap_path] = re.sub(r'^version = "[^"]+"', f'version = "{version}"', bootstrap, count=1, flags=re.M)
    changes.update({package_path: json_text(package), lock_path: json_text(lock),
               config_path: json_text(config), gradle_path: gradle.replace(declaration, f'version = "{version}+$minecraftVersion"')})
    for path, content in changes.items():
        path.write_text(content, encoding="utf-8", newline="\n")
    return changes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version")
    parser.add_argument("--launcher-version", required=True)
    args = parser.parse_args()
    paths = prepare(ROOT, args.version, args.launcher_version)
    print(f"Prepared v{args.version} / Electron {args.launcher_version} in {len(paths)} files. Update CHANGELOG.md, validate, commit and push the matching tag.")


if __name__ == "__main__":
    main()
