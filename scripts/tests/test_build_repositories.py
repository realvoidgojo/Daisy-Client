import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("build_repositories", Path(__file__).resolve().parents[1] / "check-build-repositories.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BuildRepositoriesTest(unittest.TestCase):
    def test_reads_configured_version_and_checks_matching_implementation(self):
        settings = 'maven("https://maven.kikugie.dev/releases")\nid("dev.kikugie.stonecutter") version "0.9.7"'
        requests = []
        marker = b'<project xmlns="http://maven.apache.org/POM/4.0.0"><dependencies><dependency><groupId>dev.kikugie</groupId><artifactId>stonecutter</artifactId><version>0.9.7</version></dependency></dependencies></project>'

        def read(url):
            requests.append(url)
            return marker

        self.assertEqual(module.check(settings, read), "0.9.7")
        self.assertEqual(len(requests), 2)
        self.assertTrue(requests[1].endswith("/stonecutter/0.9.7/stonecutter-0.9.7.pom"))
        with self.assertRaisesRegex(ValueError, "does not match"):
            module.check(settings, lambda url: marker.replace(b"<version>0.9.7", b"<version>0.9.6"))

    def test_failed_request_identifies_repository_and_network_diagnostics(self):
        def offline(*args, **kwargs):
            raise OSError("DNS lookup failed")

        with self.assertRaisesRegex(ValueError, "Check DNS, TLS, proxy settings"):
            module.fetch("https://maven.kikugie.dev/releases/test.pom", offline)


if __name__ == "__main__":
    unittest.main()
