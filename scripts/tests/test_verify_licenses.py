import importlib.util
import json
import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("licenses", Path(__file__).parents[1] / "verify-licenses.py")
licenses = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(licenses)


class LicenseValidationTests(unittest.TestCase):
    def test_missing_package_license_and_changed_asset_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            files = {
                "LICENSE": "Permission is hereby granted, free of charge",
                "licenses/Apache-2.0.txt": "Apache License",
                "THIRD_PARTY_NOTICES.md": "Minecraft retains its own terms",
                "src/client/resources/FONTS-LICENSE.txt": "SIL OPEN FONT LICENSE",
                "src/client/resources/ICONS-LICENSE.txt": "ISC License",
                "launcher/src/assets/fonts/OFL.txt": "SIL OPEN FONT LICENSE",
                "launcher/package.json": '{"license":"MIT"}',
                "launcher/package-lock.json": '{"packages":{"":{"license":"MIT"}}}',
                "icon.png": "fixture bytes",
            }
            for name, content in files.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content)
            inventory = {"icon.png": {"license": "MIT", "notice": "LICENSE", "source": "original fixture",
                "sha256": hashlib.sha256(b"fixture bytes").hexdigest()}}
            (root / "assets").mkdir()
            (root / "assets/licenses.json").write_text(json.dumps(inventory))
            with patch.object(licenses.subprocess, "check_output", return_value="icon.png\n"):
                self.assertFalse(licenses.verify(root))
                (root / "icon.png").write_text("changed")
                self.assertTrue(licenses.verify(root))
                (root / "icon.png").write_text("fixture bytes")
                (root / "launcher/package-lock.json").write_text('{"packages":{"dependency":{}}}')
                self.assertTrue(licenses.verify(root))
