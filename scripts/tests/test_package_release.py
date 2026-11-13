import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("package_release", Path(__file__).parents[1] / "package-release.py")
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)
from skin_artifact import CLASSES


class PackageReleaseTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.root_patch = patch.object(release, "ROOT", self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.write("settings.gradle.kts", 'versions("1.21.11", "26.2")')
        self.write("build.gradle.kts", 'version = "0.2.8.2+$minecraftVersion"')
        self.write("launcher/package.json", json.dumps({"daisyVersion": "0.2.8.2"}))
        self.write("launcher/src/config/build-version.json", '{"version":"0.2.8.2"}')
        for mc in release.versions():
            jar = self.root / f"versions/{mc}/build/libs/daisy-client-0.2.8.2+{mc}.jar"
            jar.parent.mkdir(parents=True)
            with zipfile.ZipFile(jar, "w") as archive:
                archive.writestr("fabric.mod.json", json.dumps({"id": "clientcore", "version": f"0.2.8.2+{mc}"}))
                archive.writestr("dev/daisy/clientcore/ClientCore.class", b"fixture")
                archive.writestr("clientcore.mixins.json", json.dumps({"client": ["AvatarSkinMixin", "OtherMixin"], "package": "dev.daisy.clientcore.mixin"}))
                for name in CLASSES:
                    archive.writestr(name + ".class", b"fixture")
        agent = self.root / "daisy-bootstrap/build/libs/daisy-bootstrap-0.2.8.2.jar"
        agent.parent.mkdir(parents=True)
        with zipfile.ZipFile(agent, "w") as archive:
            archive.writestr("META-INF/MANIFEST.MF", "Premain-Class: dev.daisy.bootstrap.Agent\n")

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def run_mode(self, *args):
        with patch.object(sys, "argv", ["package-release.py", *args]):
            release.main()

    def test_version_and_tag_must_agree_before_any_build(self):
        self.assertEqual(release.project_version("v0.2.8.2"), "0.2.8.2")
        with self.assertRaises(ValueError):
            release.project_version("v0.2.8.1")
        self.write("launcher/src/config/build-version.json", '{"version":"0.0.0"}')
        with self.assertRaises(ValueError):
            release.project_version()

    def test_stage_uses_one_flat_copy_and_preserves_optional_assets(self):
        self.write("launcher/src/bundled/skin/manifest.json", "{}")
        self.run_mode("stage-client")
        bundled = self.root / "launcher/src/bundled"
        self.assertEqual(len(list(bundled.glob("*.jar"))), 5)
        self.assertTrue((bundled / "skin/manifest.json").exists())
        self.assertEqual(list(bundled.glob("*/daisy-client-*.jar")), [])

    def test_default_staging_does_not_require_every_compatibility_output(self):
        other = self.root / "versions/26.2/build/libs/daisy-client-0.2.8.2+26.2.jar"
        other.unlink()
        self.run_mode("stage-client", "--minecraft", "1.21.11")
        names = {p.name for p in (self.root / "launcher/src/bundled").glob("*.jar")}
        self.assertEqual(names, {"daisy-client-0.2.8.2+1.21.11.jar", "daisy-bootstrap-0.2.8.2.jar", "daisy-skin-0.2.8.2+1.21.11.jar"})

    def test_missing_agent_does_not_destroy_staged_clients(self):
        agent = next((self.root / "daisy-bootstrap/build/libs").glob("*.jar"))
        agent.unlink()
        self.write("launcher/src/bundled/daisy-client-saved.jar", "saved")
        with self.assertRaises(ValueError):
            self.run_mode("stage-client")
        self.assertEqual((self.root / "launcher/src/bundled/daisy-client-saved.jar").read_text(), "saved")

    def test_collect_manifest_matches_real_fixture_bytes(self):
        out = self.root / "release-artifacts"
        for name in ["Daisy-Setup.exe", "Daisy-Portable.exe", "Daisy-Linux.tar.gz"]:
            self.write(f"release-artifacts/{name}", "distribution fixture")
        self.run_mode("collect", "--tag", "v0.2.8.2", "--artifacts", str(out))
        manifest = json.loads((out / "latest.json").read_text())
        self.assertEqual([m["minecraft"] for m in manifest["mods"]], release.versions())
        for mod in manifest["mods"] + manifest["skins"]:
            self.assertEqual(mod["sha256"], hashlib.sha256((out / mod["name"]).read_bytes()).hexdigest())
            self.assertIn("/releases/download/v0.2.8.2/", mod["url"])
        for key in ["installer", "portable", "linux"]:
            entry = manifest["files"][key]
            self.assertTrue(manifest[key + "Url"].endswith("/" + entry["name"]))
            self.assertEqual(entry["sha256"], hashlib.sha256((out / entry["name"]).read_bytes()).hexdigest())
        self.assertIn("latest.json", (out / "SHA256SUMS").read_text())

    def test_skin_subset_is_deterministic_and_rejects_unbundled_dependencies(self):
        client = self.root / "versions/1.21.11/build/libs/daisy-client-0.2.8.2+1.21.11.jar"
        target = self.root / "skin.jar"
        release.build_skin(client, target)
        first = target.read_bytes()
        release.build_skin(client, target)
        self.assertEqual(first, target.read_bytes())
        with zipfile.ZipFile(target) as archive:
            metadata = json.loads(archive.read("fabric.mod.json"))
            self.assertEqual(metadata["id"], "daisy_skin")
            self.assertEqual(metadata["breaks"], {"clientcore": "*"})
            self.assertNotIn("dev/daisy/clientcore/ClientCore.class", archive.namelist())
            self.assertEqual(json.loads(archive.read("daisy-skin.mixins.json"))["client"], ["AvatarSkinMixin"])
        with zipfile.ZipFile(client, "a") as archive:
            archive.writestr("dev/daisy/clientcore/cosmetic/PlayerAppearance$Unexpected.class", b"dev/daisy/clientcore/NotBundled")
        with self.assertRaisesRegex(ValueError, "external Daisy dependency"):
            release.build_skin(client, target)
        self.assertEqual(first, target.read_bytes())

    def test_collect_requires_every_distribution(self):
        with self.assertRaises(ValueError):
            self.run_mode("collect", "--tag", "v0.2.8.2", "--artifacts", str(self.root / "release-artifacts"))


if __name__ == "__main__":
    unittest.main()
