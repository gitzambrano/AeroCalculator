from __future__ import annotations

import json
import math
import unittest
from pathlib import Path

from tools.reference_physics import load_factor_from_bank, standard_atmosphere

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "tests/data/reference_cases.json").read_text(encoding="utf-8"))


class TestReferenceCases(unittest.TestCase):
    """Makes the independent reference table executable."""

    def test_reference_cases(self):
        for case in DATA["cases"]:
            with self.subTest(case=case["id"]):
                expected = case["expected"]
                if case["id"].startswith("ATM-"):
                    state = standard_atmosphere(case["input"]["H_m"])
                    actual = {
                        "T_K": state.temperature_k,
                        "p_Pa": state.pressure_pa,
                        "rho_kg_m3": state.density_kg_m3,
                    }
                    for key, value in expected.items():
                        delta = (
                            case.get("tolerance", {}).get("rho_abs", 1e-6)
                            if key == "rho_kg_m3"
                            else 1e-6
                        )
                        self.assertAlmostEqual(actual[key], value, delta=delta)
                elif case["id"] == "TURN-60DEG":
                    actual = load_factor_from_bank(
                        math.radians(case["input"]["bank_deg"])
                    )
                    self.assertAlmostEqual(
                        actual,
                        expected["load_factor"],
                        places=12,
                    )
                else:
                    self.fail(
                        f"reference case has no executable adapter: {case['id']}"
                    )
