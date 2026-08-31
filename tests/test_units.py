import math
import unittest

from tools.reference_physics import geometric_to_geopotential, geopotential_to_geometric


class TestUnitsAndGeometry(unittest.TestCase):
    """Protects PH-4, UN-1, UN-2, and UN-4."""

    def test_length_equivalence(self):
        ft = 10_000.0
        meters = ft * 0.3048
        self.assertAlmostEqual(meters, 3048.0, places=12)

    def test_speed_equivalence(self):
        knots = 100.0
        self.assertAlmostEqual(knots * 1852.0 / 3600.0, 51.44444444444444, places=12)

    def test_angle_round_trip(self):
        deg = 123.456
        rad = math.radians(deg)
        self.assertAlmostEqual(math.degrees(rad), deg, places=12)

    def test_geometric_geopotential_round_trip(self):
        for h in (0.0, 1000.0, 10_000.0, 50_000.0):
            H = geometric_to_geopotential(h)
            self.assertAlmostEqual(geopotential_to_geometric(H), h, places=7)
