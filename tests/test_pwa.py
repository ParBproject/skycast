import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SkyCastPwaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.app = (ROOT / "app.js").read_text(encoding="utf-8")
        cls.core = (ROOT / "src" / "forecast-core.js").read_text(encoding="utf-8")
        cls.worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        cls.manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))

    def test_manifest_is_installable_and_scoped_to_project(self):
        self.assertEqual(self.manifest["short_name"], "SkyCast")
        self.assertEqual(self.manifest["display"], "standalone")
        self.assertEqual(self.manifest["start_url"], "./")
        self.assertEqual(self.manifest["scope"], "./")
        self.assertEqual(self.manifest["theme_color"], "#07111f")
        self.assertTrue(self.manifest.get("icons"))

    def test_manifest_icons_exist(self):
        for icon in self.manifest["icons"]:
            self.assertTrue((ROOT / icon["src"]).is_file(), icon["src"])

    def test_app_registers_pwa_and_install_prompt(self):
        self.assertIn('rel="manifest" href="manifest.webmanifest"', self.index)
        self.assertIn('navigator.serviceWorker.register("./sw.js")', self.app)
        self.assertIn('"beforeinstallprompt"', self.app)
        self.assertIn('id="installBtn"', self.index)

    def test_hourly_forecast_is_requested_and_rendered(self):
        self.assertIn('hourly:"temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,is_day"', self.core)
        self.assertIn('id="hourlyGrid"', self.index)
        self.assertIn("function renderHourly", self.app)
        self.assertIn("start+12", self.core)

    def test_last_known_forecast_cache_is_guarded_by_ttl(self):
        self.assertIn("CACHE_TTL_MS", self.core)
        self.assertIn("function saveCachedForecast", self.app)
        self.assertIn("function readCachedForecast", self.app)
        self.assertIn("isCacheFresh", self.app)
        self.assertIn("showCachedOrUnavailable", self.app)

    def test_service_worker_precaches_required_shell(self):
        required = {
            "./index.html",
            "./styles.css",
            "./app.js",
            "./src/forecast-core.js",
            "./manifest.webmanifest",
            "./assets/app-icon.svg",
            "./assets/hero-clear.svg",
            "./assets/hero-cloud.svg",
            "./assets/hero-rain.svg",
            "./assets/hero-snow.svg",
        }
        entries = set(re.findall(r'"(\./[^\"]+)"', self.worker))
        self.assertTrue(required.issubset(entries), required - entries)
        self.assertIn("self.skipWaiting()", self.worker)
        self.assertIn("self.clients.claim()", self.worker)

    def test_service_worker_only_caches_same_origin_gets(self):
        self.assertIn('request.method !== "GET"', self.worker)
        self.assertIn("url.origin !== self.location.origin", self.worker)


if __name__ == "__main__":
    unittest.main()
