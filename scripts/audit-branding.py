#!/usr/bin/env python3
"""Audit working-tree text and filenames; exact, justified exceptions live beside this script."""
import argparse
import hashlib
import json
import os
import re
import struct
import zlib
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = ROOT / "scripts/branding-allowlist.json"
PATTERN = re.compile(r"daisy|daisy|wyz", re.IGNORECASE)
IGNORED_DIRS = {".git", ".gradle", ".kotlin", "node_modules", "build", "dist", "app",
                "out", "run", ".idea", ".vscode", ".wrangler", "__pycache__", "release-artifacts"}
BINARY_SUFFIXES = {".jar", ".class", ".exe", ".dll", ".so", ".zip", ".gz", ".7z",
                   ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".ogg", ".mp3",
                   ".mp4", ".woff", ".woff2", ".ttf", ".otf", ".cer", ".pdf"}


def files(root):
    for base, dirs, names in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED_DIRS
                         and not (Path(base).parent.name == "versions" and d == "src"))
        for name in sorted(names):
            path = Path(base) / name
            if path.is_symlink() or path.suffix.lower() in {".log", ".env"} or name.startswith(".env"):
                continue
            if path == ALLOWLIST:
                continue  # Exception data is validated below; it is not project branding.
            yield path


def findings(path, root):
    relative = path.relative_to(root).as_posix()
    if PATTERN.search(relative):
        yield relative, 0, "<path>"
    if path.suffix.lower() in BINARY_SUFFIXES:
        # Read textual PNG metadata without interpreting compressed pixel data.
        if path.suffix.lower() == ".png":
            data = path.read_bytes()
            offset = 8
            while data.startswith(b"\x89PNG\r\n\x1a\n") and offset + 12 <= len(data):
                size = struct.unpack_from(">I", data, offset)[0]
                kind = data[offset + 4:offset + 8]
                chunk = data[offset + 8:offset + 8 + size]
                offset += size + 12
                if kind not in {b"tEXt", b"iTXt", b"zTXt"}:
                    continue
                if kind == b"zTXt":
                    try:
                        keyword, value = chunk.split(b"\0", 1)
                        chunk = keyword + b" " + zlib.decompress(value[1:])
                    except (ValueError, zlib.error):
                        continue
                if kind == b"iTXt":
                    try:
                        keyword, rest = chunk.split(b"\0", 1)
                        compressed, method = rest[:2]
                        language, translated, value = rest[2:].split(b"\0", 2)
                        chunk = keyword + b" " + translated + b" " + (zlib.decompress(value) if compressed else value)
                    except (ValueError, zlib.error):
                        continue
                content = chunk.decode("utf-8", errors="replace").replace("\0", " ")
                if PATTERN.search(content):
                    yield relative, 0, "<PNG metadata> " + content
        return
    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeError:
        return
    for number, line in enumerate(text.splitlines(), 1):
        # Ordinary graphics ddaisys and random lockfile integrity digests are not names.
        check = re.sub(r"\bddaisys?\b|IntelDdaisysForPerformance", "", line, flags=re.I)
        if path.name == "package-lock.json" and re.match(r'\s*"integrity":', line):
            continue
        if PATTERN.search(check):
            yield relative, number, line


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--show-allowed", action="store_true")
    parser.add_argument("--report", type=Path, help="Write every finding and action as JSON (prefer build/reports/)")
    args = parser.parse_args()
    root = args.root.resolve()
    rules = json.loads(ALLOWLIST.read_text(encoding="utf-8"))
    exact = Counter()
    reasons = {}
    snapshots = {}
    for rule in rules:
        if not rule.get("reason", "").strip():
            raise ValueError("Every branding exception requires a reason")
        if "sha256" in rule:
            snapshots[rule["path"]] = rule
        else:
            key = (rule["path"], rule["text"])
            exact[key] += rule.get("count", 1)
            reasons[key] = rule["reason"]
    unexpected = allowed = scanned = 0
    inventory = []
    for name, rule in snapshots.items():
        path = root / name
        if (path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() != rule["sha256"]
                or root == ROOT and not path.exists()):
            unexpected += 1
            print(f"UNEXPECTED {name}:0: pinned legal/historical notice changed or is missing")
    for path in files(root):
        scanned += 1
        relative = path.relative_to(root).as_posix()
        snapshot = snapshots.get(relative)
        snapshot_ok = snapshot and hashlib.sha256(path.read_bytes()).hexdigest() == snapshot["sha256"]
        for name, line, content in findings(path, root):
            key = (name, content)
            reason = snapshot["reason"] if snapshot_ok else reasons.get(key) if exact[key] > 0 else None
            if reason:
                allowed += 1
                if not snapshot_ok:
                    exact[key] -= 1
                if args.show_allowed:
                    print(f"ALLOWED {name}:{line}: {content.strip()} [{reason}]")
            else:
                unexpected += 1
                print(f"UNEXPECTED {name}:{line}: {content.strip()}")
            inventory.append({"path": name, "line": line, "text": content,
                              "status": "allowed" if reason else "unexpected",
                              "action": reason or "Review provenance and compatibility; rename project-owned branding."})
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps({"scanned": scanned, "allowed": allowed,
            "unexpected": unexpected, "findings": inventory}, indent=2) + "\n", encoding="utf-8")
    print(f"Branding audit: {scanned} files, {allowed} justified references, {unexpected} unexpected")
    return bool(unexpected)


if __name__ == "__main__":
    raise SystemExit(main())
