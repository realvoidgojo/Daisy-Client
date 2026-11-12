#!/usr/bin/env python3
"""Validate the source layout and packaging contracts without requiring build outputs."""
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def verify():
    required = ["settings.gradle.kts", "build.gradle.kts", "stonecutter.gradle.kts",
                "gradlew", "gradlew.bat", "gradle/wrapper/gradle-wrapper.jar",
                "gradle/wrapper/gradle-wrapper.properties", "LICENSE", "THIRD_PARTY_NOTICES.md",
                "README.md", "CONTRIBUTING.md", "CHANGELOG.md", "launcher/package-lock.json",
                "launcher/src/main.js", "daisy-bootstrap/build.gradle.kts",
                ".github/workflows/ci.yml", ".github/workflows/release.yml"]
    errors = [f"Missing required file: {name}" for name in required if not (ROOT / name).is_file()]
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return True
    spec = importlib.util.spec_from_file_location("release", ROOT / "scripts/package-release.py")
    release = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(release)
    try:
        release.project_version()
        targets = release.versions()
        if not targets or len(set(targets)) != len(targets):
            errors.append("Build target list must be nonempty and unique")
        for target in targets:
            props = ROOT / f"versions/{target}/gradle.properties"
            if not props.is_file():
                errors.append(f"Missing version properties: {target}")
            elif f"minecraft_version={target}" not in props.read_text():
                errors.append(f"Wrong Minecraft version in {props.relative_to(ROOT)}")
    except (ValueError, KeyError, TypeError) as exc:
        errors.append(str(exc))
    sources = []
    for directory in [ROOT / "src/client", ROOT / "daisy-bootstrap/src/main"]:
        for path in directory.rglob("*"):
            if path.suffix not in {".java", ".kt"}:
                continue
            sources.append(path)
            declaration = re.search(r"^package\s+([\w.]+)\s*;?", path.read_text(encoding="utf-8"), re.M)
            expected = "/".join(declaration[1].split(".")) if declaration else None
            if not expected or not path.parent.as_posix().endswith("/" + expected):
                errors.append(f"Package does not match directory: {path.relative_to(ROOT)}")
    metadata = json.loads((ROOT / "src/main/resources/fabric.mod.json").read_text())
    resource_roots = [ROOT / "src/main/resources", ROOT / "src/client/resources"]
    for name in [metadata["icon"], *metadata["mixins"]]:
        if not any((base / name).is_file() for base in resource_roots):
            errors.append(f"Missing Fabric resource: {name}")
    mixins = json.loads((ROOT / "src/client/resources/clientcore.mixins.json").read_text())
    source_names = {str(p.with_suffix("")).replace("\\", "/") for p in sources}
    classes = [entry["value"] for entry in metadata["entrypoints"]["client"]]
    classes += [mixins["package"] + "." + name for name in mixins.get("client", [])]
    for name in classes:
        suffix = "/" + name.replace(".", "/")
        if not any(path.endswith(suffix) for path in source_names):
            errors.append(f"Missing entrypoint/mixin source: {name}")
    package = json.loads((ROOT / "launcher/package.json").read_text())
    lock = json.loads((ROOT / "launcher/package-lock.json").read_text())
    if package["name"] != "daisy-launcher" or package["build"]["productName"] != "Daisy Launcher":
        errors.append("Launcher package identity is inconsistent")
    if lock["version"] != package["version"] or lock["name"] != package["name"]:
        errors.append("npm package and lock metadata disagree")
    if "MIT License" not in (ROOT / "LICENSE").read_text():
        errors.append("Project MIT license is missing")
    if 'archivesName.set("daisy-client")' not in (ROOT / "build.gradle.kts").read_text():
        errors.append("Unexpected client artifact base name")
    for error in errors:
        print(f"ERROR: {error}")
    print(f"Project verification: {len(sources)} sources, {len(errors)} errors")
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(verify())
