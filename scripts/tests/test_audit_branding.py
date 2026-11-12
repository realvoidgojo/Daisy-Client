import importlib.util
import json
import subprocess
import struct
import sys
import tempfile
import unittest
import zlib
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "audit-branding.py"
SPEC = importlib.util.spec_from_file_location("audit", SCRIPT)
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


class BrandingAuditTests(unittest.TestCase):
    def test_compressed_png_provenance_is_scanned(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "icon.png"
            def chunk(kind, value):
                return struct.pack(">I", len(value)) + kind + value + struct.pack(">I", zlib.crc32(kind + value))
            path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"zTXt",
                b"Author\0\0" + zlib.compress(b"Wy" + b"Z")))
            result = list(audit.findings(path, Path(directory)))
            self.assertEqual(len(result), 1)
            self.assertIn("<PNG metadata>", result[0][2])

    def test_unknown_branding_fails_and_report_locates_it(self):
        # Construct a legacy name so this negative fixture is not itself branding.
        old = "ri" + "ver"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / (old + "-client.txt")).write_text(old + " client\n")
            ignored = root / "node_modules"
            ignored.mkdir()
            (ignored / "dependency.txt").write_text(old)
            report = root / "build/reports/audit.json"
            result = subprocess.run([sys.executable, str(SCRIPT), "--root", str(root),
                                     "--report", str(report)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            data = json.loads(report.read_text())
            self.assertEqual(data["unexpected"], 2)  # File path and source line.
            self.assertEqual({f["line"] for f in data["findings"]}, {0, 1})
            self.assertTrue(all(f["action"] for f in data["findings"]))

    def test_a_legal_exception_does_not_allow_new_text(self):
        rules = json.loads((SCRIPT.parent / "branding-allowlist.json").read_text())
        rule = next(r for r in rules if "text" in r and not r["text"].startswith("<"))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / rule["path"]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(rule["text"] + "\n" + "ri" + "ver new branding\n")
            result = subprocess.run([sys.executable, str(SCRIPT), "--root", str(root)],
                                    capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("new branding", result.stdout)


if __name__ == "__main__":
    unittest.main()
