import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"


def markdown_links(text: str):
    return re.findall(r"\[[^\]]+\]\(([^)]+)\)", text)


class TestDocumentation(unittest.TestCase):
    """Protects DC-1 through DC-5."""

    def test_major_calculator_sections_exist(self):
        text = (DOCS / "calculations.md").read_text(encoding="utf-8").lower()
        for term in ("standard atmosphere", "tas", "stall speed", "load factor", "wind triangle", "validity"):
            with self.subTest(term=term):
                self.assertIn(term, text)

    def test_units_document_has_major_quantities(self):
        text = (DOCS / "units_and_conventions.md").read_text(encoding="utf-8")
        for unit in ("ft", "Pa", "°C", "kt", "kg", "m²", "rad"):
            self.assertIn(unit, text)

    def test_local_markdown_links_resolve(self):
        paths = [ROOT / "README.md", *DOCS.glob("*.md")]
        for path in paths:
            text = path.read_text(encoding="utf-8")
            for target in markdown_links(text):
                if "://" in target or target.startswith("#"):
                    continue
                clean = target.split("#", 1)[0]
                if not clean:
                    continue
                resolved = (path.parent / clean).resolve()
                with self.subTest(source=path.name, target=target):
                    self.assertTrue(resolved.exists(), f"{path}: missing link target {target}")

    def test_skill_mirrors_identical(self):
        a = (ROOT / ".agents/skills/writing-rules/SKILL.md").read_bytes()
        b = (ROOT / ".claude/skills/writing-rules/SKILL.md").read_bytes()
        self.assertEqual(a, b)
