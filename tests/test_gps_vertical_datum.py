"""Tests for Android GPS MSL datum and parsing logic."""
from pathlib import Path
import math
import unittest

ROOT = Path(__file__).resolve().parents[1]
ANDROID = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
REQUIREMENTS = (ROOT / "docs/software_requirements.md").read_text(encoding="utf-8")
CALCULATIONS = (ROOT / "docs/calculations.md").read_text(encoding="utf-8")


def nmea_coordinate(value: str, hemisphere: str, is_latitude: bool) -> float:
    """Python reference implementation of B4A NmeaCoordinate subroutine."""
    try:
        raw = float(value)
    except ValueError:
        return 999.0
    if raw < 0:
        return 999.0
    degrees = int(math.floor(raw / 100))
    minutes = raw - 100 * degrees
    if minutes < 0 or minutes >= 60:
        return 999.0
    if is_latitude:
        if hemisphere not in ("N", "S"):
            return 999.0
        if degrees > 90 or (degrees == 90 and minutes > 0):
            return 999.0
    else:
        if hemisphere not in ("E", "W"):
            return 999.0
        if degrees > 180 or (degrees == 180 and minutes > 0):
            return 999.0
    result = degrees + minutes / 60.0
    if hemisphere in ("S", "W"):
        result = -result
    return result


def nmea_matches_last_gps_fix(
    fix_valid: bool,
    nmea_valid: bool,
    fix_tick: int,
    nmea_tick: int,
    now_tick: int,
    fix_lat: float,
    fix_lon: float,
    nmea_lat: float,
    nmea_lon: float,
) -> bool:
    """Python reference implementation of B4A NmeaMatchesLastGpsFix subroutine."""
    if not fix_valid or not nmea_valid:
        return False
    if now_tick - fix_tick > 8000 or now_tick - nmea_tick > 8000:
        return False
    if abs(fix_lat - nmea_lat) > 0.001:
        return False
    lon_diff = abs(fix_lon - nmea_lon)
    if lon_diff > 180:
        lon_diff = 360 - lon_diff
    return lon_diff <= 0.001


class GPSStateSimulator:
    """Models the B4A GPS lifecycle and state machine."""

    def __init__(self, sdk_version: int = 34):
        self.sdk_version = sdk_version
        self.gps_alt = 0.0
        self.gps_speed = 0.0
        self.gps_alt_valid = False
        self.gps_fix_valid = False
        self.gps_nmea_valid = False
        self.gps_native_msl = False
        self.gps_fix_lat = 0.0
        self.gps_fix_lon = 0.0
        self.gps_nmea_lat = 0.0
        self.gps_nmea_lon = 0.0
        self.gps_nmea_alt = 0.0
        self.gps_fix_tick = 0
        self.gps_nmea_tick = 0
        self.now_tick = 10000

    def pause(self):
        self.gps_fix_valid = False
        self.gps_alt_valid = False
        self.gps_nmea_valid = False

    def is_altitude_ready(self) -> bool:
        return self.gps_alt_valid and self.gps_fix_valid and (self.now_tick - self.gps_fix_tick <= 8000)

    def on_location_changed(
        self,
        latitude: float,
        longitude: float,
        ellipsoid_alt: float,
        speed: float,
        has_native_msl: bool = False,
        native_msl_alt: float = 0.0,
    ):
        self.gps_speed = speed
        self.gps_fix_lat = latitude
        self.gps_fix_lon = longitude
        self.gps_fix_tick = self.now_tick
        self.gps_fix_valid = True
        self.gps_alt_valid = False
        self.gps_native_msl = False

        if self.sdk_version >= 34 and has_native_msl:
            self.gps_alt = native_msl_alt
            self.gps_alt_valid = True
            self.gps_native_msl = True

        if not self.gps_alt_valid and self._nmea_matches():
            self.gps_alt = self.gps_nmea_alt
            self.gps_alt_valid = True

    def on_nmea(self, sentence: str):
        if len(sentence) < 7 or not sentence.startswith("$"):
            return
        if sentence[3:6] != "GGA":
            return
        fields = sentence.split(",")
        if len(fields) < 12:
            self.gps_nmea_valid = False
            return
        try:
            fix_quality = int(fields[6])
        except ValueError:
            self.gps_nmea_valid = False
            return
        if fix_quality <= 0 or fields[10] != "M":
            self.gps_nmea_valid = False
            return
        try:
            alt = float(fields[9])
        except ValueError:
            self.gps_nmea_valid = False
            return

        lat = nmea_coordinate(fields[2], fields[3], True)
        lon = nmea_coordinate(fields[4], fields[5], False)
        if lat == 999.0 or lon == 999.0:
            self.gps_nmea_valid = False
            return

        self.gps_nmea_lat = lat
        self.gps_nmea_lon = lon
        self.gps_nmea_alt = alt
        self.gps_nmea_tick = self.now_tick
        self.gps_nmea_valid = True

        if not self.gps_native_msl and self._nmea_matches():
            self.gps_alt = self.gps_nmea_alt
            self.gps_alt_valid = True

    def _nmea_matches(self) -> bool:
        return nmea_matches_last_gps_fix(
            self.gps_fix_valid,
            self.gps_nmea_valid,
            self.gps_fix_tick,
            self.gps_nmea_tick,
            self.now_tick,
            self.gps_fix_lat,
            self.gps_fix_lon,
            self.gps_nmea_lat,
            self.gps_nmea_lon,
        )


class GPSVerticalDatumTests(unittest.TestCase):
    def test_no_ellipsoidal_altitude_used_as_msl(self):
        self.assertNotIn("GPSalt = Location1.Altitude", ANDROID)
        self.assertNotIn("GPSalt=Location1.Altitude", ANDROID)
        self.assertIn('nativeLocation.RunMethod("hasMslAltitude", Null)', ANDROID)
        self.assertIn('nativeLocation.RunMethod("getMslAltitudeMeters", Null)', ANDROID)
        self.assertIn("If ph.SdkVersion >= 34 Then", ANDROID)
        self.assertIn("Dim nativeLocation As JavaObject = Location1", ANDROID)

    def test_nmea_fallback_validates_fix_and_datum(self):
        self.assertIn("Sub GPS_NMEA (TimeStamp As Long, Sentence As String)", ANDROID)
        self.assertIn('Sentence.SubString2(3, 6) <> "GGA"', ANDROID)
        self.assertIn('fields(10) <> "M"', ANDROID)
        self.assertIn("GPSnmeaValid = False", ANDROID)
        self.assertIn("NmeaMatchesLastGpsFix", ANDROID)
        self.assertIn("Abs(GPSfixLat - GPSnmeaLat) > 0.001", ANDROID)
        self.assertIn("If lonDiff > 180 Then lonDiff = 360 - lonDiff", ANDROID)
        self.assertIn("DateTime.Now - GPSnmeaTick > 8000", ANDROID)

    def test_unavailable_msl_blocks_calculation_and_clears_input(self):
        self.assertGreaterEqual(ANDROID.count("If indAltType = 2 And Not(GPSAltitudeReady) Then"), 2)
        self.assertIn('edtAlt.Hint = "Waiting for GPS MSL"', ANDROID)
        self.assertIn('edtAlt.Text = ""', ANDROID)
        self.assertIn("GPSaltValid = False", ANDROID)
        self.assertIn("GPSfixValid = False", ANDROID)
        self.assertIn("RefreshGPSAltitudeDisplay", ANDROID)

    def test_reference_gga_example_and_datum_equation(self):
        sentence = "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47"
        fields = sentence.split(",")
        self.assertEqual(fields[0][3:6], "GGA")
        self.assertGreater(int(fields[6]), 0)
        self.assertEqual(fields[10], "M")
        self.assertAlmostEqual(float(fields[9]) + float(fields[11]), 592.3)
        self.assertIn("h_{\\mathrm{MSL}}=h_{\\mathrm{WGS84}}-N", CALCULATIONS)
        self.assertIn("**SE-4**", REQUIREMENTS)

    def test_native_msl_precedence_on_api_34(self):
        sim = GPSStateSimulator(sdk_version=34)
        sim.on_location_changed(
            latitude=-23.5505,
            longitude=-46.6333,
            ellipsoid_alt=145.0,
            speed=12.5,
            has_native_msl=True,
            native_msl_alt=110.0,
        )
        self.assertTrue(sim.is_altitude_ready())
        self.assertEqual(sim.gps_alt, 110.0)
        self.assertEqual(sim.gps_speed, 12.5)

    def test_missing_native_msl_on_api_34_blocks_calculation(self):
        sim = GPSStateSimulator(sdk_version=34)
        sim.on_location_changed(
            latitude=-23.5505,
            longitude=-46.6333,
            ellipsoid_alt=145.0,
            speed=10.0,
            has_native_msl=False,
        )
        self.assertFalse(sim.is_altitude_ready())
        self.assertFalse(sim.gps_alt_valid)
        self.assertEqual(sim.gps_speed, 10.0)

    def test_nmea_gga_fallback_on_api_28(self):
        sim = GPSStateSimulator(sdk_version=28)
        sentence = "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47"
        lat = nmea_coordinate("4807.038", "N", True)
        lon = nmea_coordinate("01131.000", "E", False)
        self.assertAlmostEqual(lat, 48.1173)
        self.assertAlmostEqual(lon, 11.516666666666667)

        # Location first, then NMEA
        sim.on_location_changed(lat, lon, ellipsoid_alt=592.3, speed=15.0)
        self.assertFalse(sim.is_altitude_ready())
        sim.on_nmea(sentence)
        self.assertTrue(sim.is_altitude_ready())
        self.assertAlmostEqual(sim.gps_alt, 545.4)

    def test_reversed_callback_order_nmea_before_location(self):
        sim = GPSStateSimulator(sdk_version=28)
        sentence = "$GNGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47"
        lat = nmea_coordinate("4807.038", "N", True)
        lon = nmea_coordinate("01131.000", "E", False)

        # NMEA first, then Location
        sim.on_nmea(sentence)
        self.assertFalse(sim.is_altitude_ready())
        sim.on_location_changed(lat, lon, ellipsoid_alt=592.3, speed=15.0)
        self.assertTrue(sim.is_altitude_ready())
        self.assertAlmostEqual(sim.gps_alt, 545.4)

    def test_southern_and_western_hemispheres(self):
        lat = nmea_coordinate("2333.030", "S", True)
        lon = nmea_coordinate("04638.000", "W", False)
        self.assertAlmostEqual(lat, -23.5505)
        self.assertAlmostEqual(lon, -46.63333333333333)

    def test_longitude_wrap_around_180_boundary(self):
        matched = nmea_matches_last_gps_fix(
            fix_valid=True,
            nmea_valid=True,
            fix_tick=1000,
            nmea_tick=1000,
            now_tick=1000,
            fix_lat=10.0,
            fix_lon=-179.9995,
            nmea_lat=10.0,
            nmea_lon=179.9998,
        )
        self.assertTrue(matched)

        mismatched = nmea_matches_last_gps_fix(
            fix_valid=True,
            nmea_valid=True,
            fix_tick=1000,
            nmea_tick=1000,
            now_tick=1000,
            fix_lat=10.0,
            fix_lon=-179.9950,
            nmea_lat=10.0,
            nmea_lon=179.9900,
        )
        self.assertFalse(mismatched)

    def test_stale_or_invalid_nmea_rejected(self):
        sim = GPSStateSimulator(sdk_version=28)
        lat = 48.1173
        lon = 11.5167
        sim.on_location_changed(lat, lon, 592.3, 10.0)

        # Fix quality 0 = invalid
        sim.on_nmea("$GPGGA,123519,4807.038,N,01131.000,E,0,00,99.9,545.4,M,46.9,M,,*47")
        self.assertFalse(sim.is_altitude_ready())

        # Altitude unit not M (e.g. Feet)
        sim.on_nmea("$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,1789.3,F,46.9,M,,*47")
        self.assertFalse(sim.is_altitude_ready())

        # Geographically mismatched fix (> 0.001 deg)
        sim.on_nmea("$GPGGA,123519,4810.000,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47")
        self.assertFalse(sim.is_altitude_ready())

        # Valid fix then time passes > 8s
        sim.on_nmea("$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47")
        self.assertTrue(sim.is_altitude_ready())
        sim.now_tick += 8500
        self.assertFalse(sim.is_altitude_ready())

    def test_pause_clears_valid_state(self):
        sim = GPSStateSimulator(sdk_version=34)
        sim.on_location_changed(10.0, 20.0, 150.0, 5.0, has_native_msl=True, native_msl_alt=120.0)
        self.assertTrue(sim.is_altitude_ready())
        sim.pause()
        self.assertFalse(sim.is_altitude_ready())

    def test_altitude_unit_conversions(self):
        # 110 m and 545.4 m into standard units
        factors = {
            "m": 1.0,
            "ft": 0.3048,
            "km": 1000.0,
            "nm": 1852.0,
            "mi": 1609.344,
            "in": 0.0254,
        }
        alt_m = 110.0
        self.assertAlmostEqual(alt_m / factors["ft"], 360.892388, places=4)
        self.assertAlmostEqual(alt_m / factors["km"], 0.11, places=5)
        self.assertAlmostEqual(alt_m / factors["nm"], 0.059395, places=4)

        ref_m = 545.4
        self.assertAlmostEqual(ref_m / factors["ft"], 1789.370078, places=4)
        self.assertAlmostEqual(ref_m / factors["km"], 0.5454, places=5)


if __name__ == "__main__":
    unittest.main()
