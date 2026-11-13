import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch
spec = importlib.util.spec_from_file_location("verify_release", Path(__file__).parents[1] / "verify-release.py")
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
class StableReleaseTests(unittest.TestCase):
    def test_legacy_verification_step_exports_the_prepared_release_tag(self):
        workflow = (Path(__file__).parents[2] / ".github/workflows/release.yml").read_text(encoding="utf-8")
        step = workflow.split("      - name: Verify installed stable launcher upgrade through GitHub Latest", 1)[1].split("      - ", 1)[0]
        configuration = step.split("        run:", 1)[0]
        self.assertIn("        env:\n          RELEASE_TAG: ${{ needs.prepare.outputs.tag }}", configuration)

    def test_published_tag_is_insufficient_when_latest_still_points_to_old_release(self):
        old = json.dumps({"tag_name": "v0.2.8.4", "draft": False, "prerelease": False}).encode()
        with patch.object(verify, "read", return_value=old):
            with self.assertRaisesRegex(ValueError, "GitHub Latest"):
                verify.verify_latest_stable("1.0.0", b"manifest", attempts=1)
    def test_latest_redirect_must_serve_exactly_the_published_manifest(self):
        latest = json.dumps({"tag_name": "v1.0.0", "draft": False, "prerelease": False}).encode()
        with patch.object(verify, "read", side_effect=[latest, b"old cached manifest"]):
            with self.assertRaisesRegex(ValueError, "launcher endpoint"):
                verify.verify_latest_stable("1.0.0", b"manifest", attempts=1)
        with patch.object(verify, "read", side_effect=[latest, b"manifest"]):
            verify.verify_latest_stable("1.0.0", b"manifest", attempts=1)
