import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "tests/data/characterization_cases.json").read_text(encoding="utf-8"))


class TestSourceCharacterization(unittest.TestCase):
    """Protects QR-3 and the pre-refactor source baseline."""

    def test_expected_modules_and_libraries(self):
        text = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
        modules = [m.group(1).strip() for m in re.finditer(r"^Module\d+=(.+)$", text, re.MULTILINE)]
        libraries = [m.group(1).strip().lower() for m in re.finditer(r"^Library\d+=(.+)$", text, re.MULTILINE)]
        self.assertEqual(modules, DATA["declared_modules"])
        self.assertEqual(libraries, DATA["declared_libraries"])

    def test_calculation_entry_points_still_exist(self):
        text = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
        for sub in DATA["required_subs"]:
            with self.subTest(sub=sub):
                self.assertRegex(text, rf"(?im)^\s*Sub\s+{re.escape(sub)}\b")
