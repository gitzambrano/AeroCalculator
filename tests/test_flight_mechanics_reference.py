import math
import unittest

from tools.reference_physics import (
    bank_from_load_factor,
    load_factor_from_bank,
    stall_speed_tas,
)


class TestFlightMechanicsReference(unittest.TestCase):
    """Protects PH-6 and PH-7."""

    def test_sixty_degree_bank_is_two_g(self):
        n = load_factor_from_bank(math.radians(60.0))
        self.assertAlmostEqual(n, 2.0, places=12)

    def test_bank_load_factor_round_trip(self):
        for deg in (0.0, 15.0, 30.0, 45.0, 60.0):
            bank = math.radians(deg)
            n = load_factor_from_bank(bank)
            self.assertAlmostEqual(bank_from_load_factor(n), bank, places=12)

    def test_stall_speed_scales_with_sqrt_load_factor(self):
        v1 = stall_speed_tas(1000.0, 1.0, 1.225, 16.0, 1.5)
        v2 = stall_speed_tas(1000.0, 2.0, 1.225, 16.0, 1.5)
        self.assertAlmostEqual(v2 / v1, math.sqrt(2.0), places=12)
