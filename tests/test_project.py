from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DashboardParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.local_refs = set()
        self.title_seen = False
        self.meta_description = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "meta" and attrs.get("name") == "description":
            self.meta_description = attrs.get("content")
        for key in ("src", "href"):
            value = attrs.get(key)
            if not value or value.startswith(("http://", "https://", "#", "mailto:", "tel:")):
                continue
            self.local_refs.add(value.split("?", 1)[0])


class SkyCastProjectTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.readme = (ROOT / "README.md").read_text(encoding="utf-8")
        cls.parser = DashboardParser()
        cls.parser.feed(cls.index)

    def test_dashboard_has_expected_live_regions(self):
        required = {
            "city", "refreshBtn", "status", "currentCondition", "currentTemp",
            "forecastGrid", "chart", "insights", "humidityMetric", "windMetric",
            "rainMetric", "sunsetMetric", "timezoneLabel",
        }
        self.assertTrue(required.issubset(self.parser.ids), required - self.parser.ids)

    def test_open_meteo_is_the_weather_provider(self):
        app = self.index.lower()
        readme = self.readme.lower()
        self.assertIn("open-meteo", app)
        self.assertIn("api.open-meteo.com/v1/forecast", app)
        self.assertNotIn("7timer", app)
        self.assertIn("open-meteo", readme)

    def test_all_local_html_references_exist(self):
        missing = []
        for ref in sorted(self.parser.local_refs):
            if ref in ("./", "index.html"):
                continue
            target = ROOT / ref.lstrip("./")
            if not target.exists():
                missing.append(ref)
        self.assertEqual(missing, [])

    def test_all_four_condition_artworks_exist(self):
        for theme in ("clear", "cloud", "rain", "snow"):
            self.assertTrue((ROOT / f"assets/hero-{theme}.svg").is_file())
            self.assertIn(f"assets/hero-${{theme}}.svg", self.index)

    def test_city_catalog_remains_complete(self):
        city_names = re.findall(r'\{name:"([^"]+)",lat:', self.index)
        self.assertEqual(len(city_names), 22)
        self.assertEqual(len(city_names), len(set(city_names)))

    def test_readme_preview_assets_exist(self):
        for ref in re.findall(r'<img src="([^"]+)"', self.readme):
            self.assertTrue((ROOT / ref).is_file(), ref)

    def test_metadata_is_present(self):
        self.assertIsNotNone(self.parser.meta_description)
        self.assertGreater(len(self.parser.meta_description or ""), 40)
        self.assertIn("<title>SkyCast — European Weather Dashboard</title>", self.index)

    def test_legacy_page_routes_to_main_dashboard(self):
        legacy = (ROOT / "european_weather_forecast.html").read_text(encoding="utf-8")
        self.assertIn("url=./index.html", legacy)
        self.assertIn('href="./index.html"', legacy)


if __name__ == "__main__":
    unittest.main()
