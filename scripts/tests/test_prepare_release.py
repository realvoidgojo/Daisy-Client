import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("prepare_release", Path(__file__).parents[1] / "prepare-release.py")
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


class PrepareReleaseTests(unittest.TestCase):
    def test_versions_are_coordinated_and_invalid_requests_leave_files_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            inputs = {
                "launcher/package.json": '{"version":"0.1.8","daisyVersion":"0.2.8.2"}',
                "launcher/package-lock.json": '{"version":"0.1.8","packages":{"":{"version":"0.1.8"}}}',
                "launcher/src/config/build-version.json": '{"version":"0.2.8.2","channel":"stable","builtAt":"old"}',
                "launcher/src/config/update-manifest.json": '{"version":"0.2.8.2","channel":"stable"}',
                "build.gradle.kts": 'version = "0.2.8.2+$minecraftVersion"\n',
                "daisy-bootstrap/build.gradle.kts": 'version = "0.1.9.0"\n',
            }
            for name, content in inputs.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content)
            for version, launcher in [("../bad", "0.1.9"), ("0.2.8.1", "0.1.9"), ("0.2.8.3", "0.1.8")]:
                with self.assertRaises(ValueError):
                    release.prepare(root, version, launcher)
                for name, content in inputs.items():
                    self.assertEqual((root / name).read_text(), content)
            release.prepare(root, "0.2.8.3", "0.1.9")
            package = json.loads((root / "launcher/package.json").read_text())
            lock = json.loads((root / "launcher/package-lock.json").read_text())
            config = json.loads((root / "launcher/src/config/build-version.json").read_text())
            self.assertEqual(package["daisyVersion"], config["version"])
            self.assertEqual(package["version"], lock["packages"][""]["version"])
            self.assertNotIn("builtAt", config)
            self.assertIn('0.2.8.3+$minecraftVersion', (root / "build.gradle.kts").read_text())
            release.prepare(root, "1.0.0-beta.1", "1.0.0-beta.1")
            beta = json.loads((root / "launcher/src/config/build-version.json").read_text())
            self.assertEqual(beta["channel"], "beta")
            self.assertIn('version = "1.0.0-beta.1"', (root / "daisy-bootstrap/build.gradle.kts").read_text())

            release.prepare(root, "1.0.0", "1.0.0")
            for name in ["build-version.json", "update-manifest.json"]:
                metadata = json.loads((root / "launcher/src/config" / name).read_text())
                self.assertEqual(metadata["version"], "1.0.0")
                self.assertEqual(metadata["channel"], "stable")
