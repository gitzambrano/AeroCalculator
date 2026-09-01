from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AeroCalculator.b4a"


class TestProductionFormulaRegression(unittest.TestCase):
    """Source guards for independently verified production equations."""

    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_text(encoding="utf-8-sig")
        cls.compact = re.sub(r"\s+", "", cls.source)

    def test_impact_pressure_input_recovers_mach_with_square_root(self):
        corrected = "mach=Sqrt(5*(Power(((Qc/P)+1),(1/3.5))-1))"
        historical_bug = "mach=5*(Power(((Qc/P)+1),(1/3.5))-1)"
        self.assertIn(corrected, self.compact)
        self.assertNotIn(historical_bug, self.compact)
