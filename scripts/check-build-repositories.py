#!/usr/bin/env python3
"""Check the configured Stonecutter marker and implementation before Gradle starts.

This diagnoses current network availability; Gradle remains responsible for resolving
the complete graph. Offline builds can intentionally omit this network preflight.
"""
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def coordinates(settings):
    version = re.search(r'id\("dev\.kikugie\.stonecutter"\)\s+version\s+"([\w.-]+)"', settings)
    repository = re.search(r'maven\("(https://maven\.kikugie\.dev/releases)/?"\)', settings)
    if not version or not repository:
        raise ValueError("Cannot identify the configured Stonecutter version and official repository.")
    return repository[1], version[1]


def fetch(url, opener=urllib.request.urlopen):
    request = urllib.request.Request(url, headers={"User-Agent": "Daisy-build-preflight/1"})
    try:
        with opener(request, timeout=25) as response:
            result = response.read(1024 * 1024 + 1)
            if len(result) > 1024 * 1024:
                raise ValueError("Repository metadata exceeds its size limit.")
            return result
    except (OSError, urllib.error.URLError) as error:
        raise ValueError(f"Repository request failed: {url}\n{error}\nCheck DNS, TLS, proxy settings and repository availability. The configured plugin version has not been changed.") from error


def check(settings, reader=fetch):
    repository, version = coordinates(settings)
    marker = f"{repository}/dev/kikugie/stonecutter/dev.kikugie.stonecutter.gradle.plugin/{version}/dev.kikugie.stonecutter.gradle.plugin-{version}.pom"
    root = ET.fromstring(reader(marker))
    ns = {"m": "http://maven.apache.org/POM/4.0.0"}
    dependency = root.find("m:dependencies/m:dependency", ns)
    if dependency is None:
        raise ValueError("Stonecutter marker contains no implementation dependency.")
    group, artifact, resolved = (dependency.findtext(f"m:{name}", namespaces=ns) for name in ("groupId", "artifactId", "version"))
    if (group, artifact, resolved) != ("dev.kikugie", "stonecutter", version):
        raise ValueError("Stonecutter marker does not match the configured implementation.")
    reader(f"{repository}/dev/kikugie/stonecutter/{version}/stonecutter-{version}.pom")
    return version


if __name__ == "__main__":
    try:
        version = check((ROOT / "settings.gradle.kts").read_text(encoding="utf-8"))
        print(f"Stonecutter {version}: official plugin marker and implementation metadata reachable.")
    except (ValueError, ET.ParseError) as error:
        print(f"Build repository preflight failed: {error}", file=sys.stderr)
        sys.exit(1)
