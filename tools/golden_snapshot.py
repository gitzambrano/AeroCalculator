#!/usr/bin/env python3
"""Generate independent reference snapshots.

Normal execution prints the generated JSON. --write replaces only the
reference snapshot after an explicit user action. Characterization data is
never overwritten by this tool.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from reference_physics import standard_atmosphere, stall_speed_tas, load_factor_from_bank

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "tests/data/reference_cases.generated.json"


def generate() -> dict:
    altitudes = [0.0, 5_000.0, 11_000.0, 20_000.0, 32_000.0, 47_000.0, 51_000.0, 71_000.0]
    return {
        "atmosphere": [
            {
                "H_m": H,
                "T_K": standard_atmosphere(H).temperature_k,
                "p_Pa": standard_atmosphere(H).pressure_pa,
                "rho_kg_m3": standard_atmosphere(H).density_kg_m3,
            }
            for H in altitudes
        ],
        "mechanics": {
            "n_at_60deg": load_factor_from_bank(60.0 * 3.141592653589793 / 180.0),
            "stall_example_m_s": stall_speed_tas(1000.0, 1.0, 1.225, 16.0, 1.5),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    text = json.dumps(generate(), indent=2, sort_keys=True) + "\n"
    if args.write:
        TARGET.write_text(text, encoding="utf-8")
        print(f"wrote {TARGET.relative_to(ROOT)}")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
