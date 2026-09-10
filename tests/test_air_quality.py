from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SkyCastAirQualityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        cls.controller = (ROOT / "air-quality.js").read_text(encoding="utf-8")
        cls.core = (ROOT / "src" / "air-quality-core.js").read_text(encoding="utf-8")

    def test_dashboard_exposes_atmospheric_regions(self):
        for marker in (
            'id="airPanel"', 'id="aqiScore"', 'id="aqiLevel"',
            'id="pm25Metric"', 'id="pm10Metric"', 'id="uvMetric"',
            'id="ozoneMetric"', 'id="pollenMetric"', 'id="airStatus"',
        ):
            self.assertIn(marker, self.index)

    def test_air_quality_modules_are_loaded(self):
        self.assertIn('href="styles/air-quality.css"', self.index)
        self.assertIn('src="src/air-quality-core.js"', self.index)
        self.assertIn('src="air-quality.js"', self.index)
        self.assertIn("air-quality-api.open-meteo.com/v1/air-quality", self.core)

    def test_cams_attribution_is_visible(self):
        self.assertIn("CAMS ENSEMBLE", self.index)
        self.assertIn("Open-Meteo", self.index)

    def test_air_quality_failure_isolated_from_weather_controller(self):
        self.assertNotIn("buildAirQualityURL", (ROOT / "app.js").read_text(encoding="utf-8"))
        self.assertIn("Weather forecast remains available separately", self.controller)

    def test_pwa_precaches_atmospheric_modules(self):
        for asset in (
            './styles/air-quality.css', './air-quality.js', './src/air-quality-core.js'
        ):
            self.assertIn(f'"{asset}"', self.worker)
        self.assertIn('skycast-shell-v6', self.worker)


if __name__ == "__main__":
    unittest.main()
