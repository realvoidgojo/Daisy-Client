#!/usr/bin/env python3
"""Run a clean, verified client and native Electron build from the repository root."""
import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(*command, cwd=ROOT):
    print("Running: " + " ".join(map(str, command)), flush=True)
    subprocess.run(list(map(str, command)), cwd=cwd, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-install", action="store_true", help="Reuse existing npm dependencies")
    parser.add_argument("--default-only", action="store_true", help="Build only the development target")
    args = parser.parse_args()
    run(sys.executable, "scripts/verify-project.py")
    run(sys.executable, "scripts/audit-branding.py")
    run(sys.executable, "scripts/verify-licenses.py")
    run(sys.executable, "-m", "unittest", "discover", "-s", "scripts/tests", "-v")
    wrapper = ROOT / ("gradlew.bat" if os.name == "nt" else "gradlew")
    # Invoke sh explicitly: no executable-bit requirement for Windows-created checkouts.
    command = [str(wrapper)] if os.name == "nt" else ["sh", str(wrapper)]
    tasks = [":1.21.11:clean", ":1.21.11:build", ":1.21.11:check", ":daisy-bootstrap:build"] if args.default_only else ["clean", "build", "check"]
    run(*command, *tasks, "--console=plain", "--no-build-cache")
    targets = ["--minecraft", "1.21.11"] if args.default_only else []
    run(sys.executable, "scripts/package-release.py", "stage-client", *targets)
    npm = "npm.cmd" if os.name == "nt" else "npm"
    if not args.skip_install:
        run(npm, "ci", cwd=ROOT / "launcher")
    run(npm, "test", cwd=ROOT / "launcher")
    if sys.platform not in {"win32", "linux"}:
        raise ValueError("Native launcher packaging currently supports Windows and Linux")
    run(npm, "run", "dist" if os.name == "nt" else "dist:linux", cwd=ROOT / "launcher")
    expected = [ROOT / "launcher/dist" / name for name in (
        ["Daisy-Setup.exe", "Daisy-Portable.exe"] if os.name == "nt" else ["Daisy-Linux.tar.gz"])]
    expected += list((ROOT / "launcher/src/bundled").glob("*.jar"))
    for path in expected:
        if not path.is_file() or not path.stat().st_size:
            raise ValueError(f"Missing or empty artifact: {path}")
        print(f"{path.relative_to(ROOT)} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    try:
        main()
    except (subprocess.CalledProcessError, OSError, ValueError) as exc:
        print(f"Clean build failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
