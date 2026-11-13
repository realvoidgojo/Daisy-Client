import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))
from versioning import version_key


class VersioningTests(unittest.TestCase):
    def test_legacy_beta_and_stable_order(self):
        values = ["0.2.8.4", "1.0.0-alpha.1", "1.0.0-beta.1", "1.0.0-beta.10", "1.0.0-rc.1", "1.0.0"]
        self.assertEqual(sorted(values, key=version_key), values)
        self.assertEqual(version_key("1.0.0.0"), version_key("1.0.0"))
        for value in ["../bad", "1.0", "v1.0.0", "1.0.0-beta"]:
            with self.assertRaises(ValueError):
                version_key(value)
