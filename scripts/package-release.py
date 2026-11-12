#!/usr/bin/env python3
"""Stage real Gradle outputs or collect verified release artifacts; never builds JARs."""
import argparse
import hashlib
import json
import re
import shutil
import zipfile
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
REPO = "https://github.com/realvoidgojo/Daisy-Client"


def versions():
    settings = (ROOT / "settings.gradle.kts").read_text(encoding="utf-8")
    return re.findall(r'"([\d.]+)"', re.search(r'^\s*versions\(([^)]+)\)', settings, re.M)[1])


def client_jars():
    version = json.loads((ROOT / "launcher/package.json").read_text(encoding="utf-8"))["daisyVersion"]
    result = []
    for mc in versions():
        jar = ROOT / f"versions/{mc}/build/libs/daisy-client-{version}+{mc}.jar"
        with zipfile.ZipFile(jar) as archive:
            metadata = json.loads(archive.read("fabric.mod.json"))
            if metadata["version"] != f"{version}+{mc}" or metadata["id"] != "clientcore":
                raise ValueError(f"Wrong client metadata: {jar}")
            if "dev/daisy/clientcore/ClientCore.class" not in archive.namelist():
                raise ValueError(f"Missing Daisy entrypoint: {jar}")
        result.append((mc, jar))
    return version, result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["stage-client", "collect"])
    parser.add_argument("--artifacts", type=Path, default=ROOT / "release-artifacts")
    parser.add_argument("--tag", help="Must equal v<daisyVersion> for release collection")
    args = parser.parse_args()
    version, jars = client_jars()
    if args.mode == "stage-client":
        bundled = ROOT / "launcher/src/bundled"
        bundled.mkdir(parents=True, exist_ok=True)
        # These are generated staging files only. Never overwrite unrelated bundled assets.
        for old in bundled.glob("daisy-client-*.jar"):
            old.unlink()
        for _, jar in jars:
            shutil.copy2(jar, bundled / jar.name)
        agents = list((ROOT / "daisy-bootstrap/build/libs").glob("daisy-bootstrap-*.jar"))
        agents = [p for p in agents if not p.name.endswith("-sources.jar")]
        if len(agents) != 1:
            raise ValueError("Build :daisy-bootstrap:build before staging (expected one agent JAR)")
        for old in bundled.glob("daisy-bootstrap-*.jar"):
            old.unlink()
        shutil.copy2(agents[0], bundled / agents[0].name)
        print(f"Staged {len(jars)} Fabric client JARs and the existing bootstrap agent")
        return
    if args.tag != f"v{version}":
        raise ValueError(f"Release tag must be v{version}, got {args.tag!r}")
    out = args.artifacts.resolve()
    out.mkdir(parents=True, exist_ok=True)
    base = f"{REPO}/releases/download/{quote(args.tag)}/"
    mods = []
    for mc, jar in jars:
        shutil.copy2(jar, out / jar.name)
        mods.append({"minecraft": mc, "name": jar.name, "url": base + quote(jar.name),
                     "size": jar.stat().st_size, "sha256": hashlib.sha256(jar.read_bytes()).hexdigest()})
    # Launcher artifacts are downloaded here by the release workflow, or copied here locally.
    required = {"installerUrl": "Daisy-Setup.exe", "portableUrl": "Daisy-Portable.exe",
                "linuxUrl": "Daisy-Linux.tar.gz"}
    for name in required.values():
        if not (out / name).is_file():
            raise ValueError(f"Missing Electron distribution: {out / name}")
    manifest = {"name": "Daisy Client", "version": version, "minimumVersion": "0.1.7",
                "required": False, "pageUrl": f"{REPO}/releases/tag/{args.tag}", "mods": mods,
                **{key: base + name for key, name in required.items()}}
    # Full installer/portable downloads use the updater's existing fallback path.
    manifest["files"] = {key.removesuffix("Url"): {"name": name,
        "size": (out / name).stat().st_size,
        "sha256": hashlib.sha256((out / name).read_bytes()).hexdigest()}
        for key, name in required.items()}
    (out / "latest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    files = sorted(p for p in out.iterdir() if p.is_file() and p.name != "SHA256SUMS")
    (out / "SHA256SUMS").write_text("".join(
        f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n" for p in files), encoding="utf-8")
    print(f"Collected {len(mods)} Fabric clients, Electron distributions and checksums in {out}")


if __name__ == "__main__":
    main()
