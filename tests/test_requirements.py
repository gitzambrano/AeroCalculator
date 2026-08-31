import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class TestRequirements(unittest.TestCase):
    """Protects DC and QR traceability rules."""

    def test_requirement_ids_are_unique(self):
        text = (ROOT / "docs/software_requirements.md").read_text(encoding="utf-8")
        ids = re.findall(r"\*\*([A-Z]{2}-\d+)\*\*", text)
        self.assertGreater(len(ids), 20)
        self.assertEqual(len(ids), len(set(ids)))

    def test_required_prefixes_exist(self):
        text = (ROOT / "docs/software_requirements.md").read_text(encoding="utf-8")
        for prefix in ("SC", "PH", "UN", "UI", "AP", "SE", "DC", "QR", "RL"):
            with self.subTest(prefix=prefix):
                self.assertRegex(text, rf"\*\*{prefix}-\d+\*\*")
