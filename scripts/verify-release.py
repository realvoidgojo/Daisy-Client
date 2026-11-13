#!/usr/bin/env python3
"""Verify a published release's complete inventory and upload digests."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

REPO = "https://api.github.com/repos/realvoidgojo/Daisy-Client"


def read(url, api=False):
    headers = {"User-Agent": "Daisy-Release-Verification"}
    if api:
        headers["Accept"] = "application/vnd.github+json"
        if os.environ.get("GH_TOKEN"):
            headers["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
    with urlopen(Request(url, headers=headers), timeout=120) as response:
        return response.read()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tag", required=True)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location("release", Path(__file__).with_name("package-release.py"))
    package = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(package)
    version = package.project_version(args.tag)
    release = json.loads(read(f"{REPO}/releases/tags/{args.tag}", api=True))
    if release["draft"] or release["prerelease"] != ("-" in version):
        raise ValueError("Expected a published release in the matching channel")
    assets = {asset["name"]: asset for asset in release["assets"]}
    expected = {f"daisy-client-{version}+{mc}.jar" for mc in package.versions()}
    expected.update(f"daisy-skin-{version}+{mc}.jar" for mc in package.versions())
    expected.update({"Daisy-Setup.exe", "Daisy-Portable.exe", "Daisy-Linux.tar.gz", "latest.json", "SHA256SUMS"})
    if set(assets) != expected:
        raise ValueError(f"Release asset inventory differs: {set(assets) ^ expected}")
    manifest_bytes = read(assets["latest.json"]["browser_download_url"])
    manifest = json.loads(manifest_bytes)
    sums_bytes = read(assets["SHA256SUMS"]["browser_download_url"])
    if assets["SHA256SUMS"].get("digest") != "sha256:" + hashlib.sha256(sums_bytes).hexdigest():
        raise ValueError("Checksum file upload digest does not match")
    sums = sums_bytes.decode("utf-8")
    checksums = {name: checksum for checksum, name in (line.split("  ", 1) for line in sums.splitlines())}
    if set(checksums) != expected - {"SHA256SUMS"}:
        raise ValueError("Checksum inventory does not match release assets")
    for name, checksum in checksums.items():
        asset = assets[name]
        if asset.get("digest") != f"sha256:{checksum}" or asset["state"] != "uploaded" or asset["size"] <= 0:
            raise ValueError(f"Upload digest or state mismatch: {name}")
    if hashlib.sha256(manifest_bytes).hexdigest() != checksums["latest.json"] or manifest["version"] != version:
        raise ValueError("Release manifest digest or version mismatch")
    entries = manifest["mods"] + manifest["skins"] + list(manifest["files"].values())
    if len(manifest["mods"]) != len(package.versions()) or {m["minecraft"] for m in manifest["mods"]} != set(package.versions()):
        raise ValueError("Client manifest does not cover every target exactly once")
    if len(manifest["skins"]) != len(package.versions()) or {m["minecraft"] for m in manifest["skins"]} != set(package.versions()):
        raise ValueError("Skin manifest does not cover every target exactly once")
    for entry in entries:
        asset = assets[entry["name"]]
        if entry["size"] != asset["size"] or entry["sha256"] != checksums[entry["name"]]:
            raise ValueError(f"Manifest metadata mismatch: {entry['name']}")
    for entry in manifest["mods"] + manifest["skins"]:
        kind = "skin" if entry in manifest["skins"] else "client"
        if entry["name"] != f"daisy-{kind}-{version}+{entry['minecraft']}.jar":
            raise ValueError("Client filename does not match its Minecraft target")
        if entry["url"] != assets[entry["name"]]["browser_download_url"]:
            raise ValueError(f"Wrong client download URL: {entry['name']}")
    if set(manifest["files"]) != {"installer", "portable", "linux"}:
        raise ValueError("Missing launcher distribution metadata")
    for kind, entry in manifest["files"].items():
        if manifest[f"{kind}Url"] != assets[entry["name"]]["browser_download_url"]:
            raise ValueError(f"Wrong distribution download URL: {kind}")
    print(f"Verified {args.tag}: {len(assets)} published assets and all upload digests match the release manifest.")


if __name__ == "__main__":
    main()
