from __future__ import annotations

import math
import random
import re
import unittest
from pathlib import Path

from tools.reference_physics import EARTH_RADIUS_M, P0, R_AIR, standard_atmosphere

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
COMPACT = re.sub(r"\\s+", "", SOURCE)
G0 = 9.80665


def b4a_std(h: float) -> tuple[float, float]:
    if h < 11000.0:
        t = 288.15 - 0.0065 * h
        pr = (t / 288.15) ** 5.2558797
    elif h < 20000.0:
        t = 216.65
        pr = 0.223360869430 * math.exp(-G0 * (h - 11000.0) / (R_AIR * 216.65))
    elif h < 32000.0:
        t = 216.65 + 0.001 * (h - 20000.0)
        pr = 0.054032839124 * (216.65 / t) ** 34.16320
    elif h < 47000.0:
        t = 228.65 + 0.0028 * (h - 32000.0)
        pr = 0.008566649658 * (228.65 / t) ** 12.20114
    elif h < 51000.0:
        t = 270.65
        pr = 0.001094554881 * math.exp(-G0 * (h - 47000.0) / (R_AIR * 270.65))
    elif h < 71000.0:
        t = 270.65 - 0.0028 * (h - 51000.0)
        pr = 0.000660631908 * (t / 270.65) ** 12.20114
    else:
        t = 214.65 - 0.002 * (h - 71000.0)
        pr = 0.000039046555 * (t / 214.65) ** 17.08160
    return t, pr


def altitude_residual(h_geopot: float, hp: float, *, delta_isa: float | None = None, oat_c: float | None = None) -> float:
    t_std, pr = b4a_std(hp)
    isa = delta_isa if delta_isa is not None else oat_c + 273.15 - t_std
    return hp - h_geopot - 29.271247 * isa * math.log(pr)


def solve_hp(h_geopot: float, *, delta_isa: float | None = None, oat_c: float | None = None) -> tuple[float, int]:
    lo, hi = -5000.0, 84852.0
    flo = altitude_residual(h_geopot, lo, delta_isa=delta_isa, oat_c=oat_c)
    fhi = altitude_residual(h_geopot, hi, delta_isa=delta_isa, oat_c=oat_c)
    if flo * fhi > 0:
        return h_geopot, 0
    x = h_geopot if lo < h_geopot < hi else 0.5 * (lo + hi)
    for i in range(40):
        fx = altitude_residual(h_geopot, x, delta_isa=delta_isa, oat_c=oat_c)
        if abs(fx) <= 0.001:
            return x, i + 1
        if flo * fx <= 0:
            hi, fhi = x, fx
        else:
            lo, flo = x, fx
        xl, xu = max(lo, x - 1.0), min(hi, x + 1.0)
        deriv = 0.0 if xu <= xl else (
            altitude_residual(h_geopot, xu, delta_isa=delta_isa, oat_c=oat_c)
            - altitude_residual(h_geopot, xl, delta_isa=delta_isa, oat_c=oat_c)
        ) / (xu - xl)
        candidate = x - fx / deriv if abs(deriv) > 1e-9 else 0.5 * (lo + hi)
        if not lo < candidate < hi:
            candidate = 0.5 * (lo + hi)
        x = candidate
    return x, 40


def wind_vector(speed: float, wind_from: float) -> tuple[float, float]:
    return -speed * math.cos(wind_from), -speed * math.sin(wind_from)


def norm(a: float) -> float:
    return (a + math.pi) % (2 * math.pi) - math.pi


def solve_wind(tas: float, gs: float, use_gs: bool, angle1: int, angle2: int, a1: float, a2: float, ws: float, wd: float):
    wx, wy = wind_vector(ws, wd)
    if use_gs:
        if angle1 == 0:
            track = a1
            gx, gy = gs * math.cos(track), gs * math.sin(track)
            ax, ay = gx - wx, gy - wy
            tas = math.hypot(ax, ay)
            air = math.atan2(ay, ax)
            if angle2 == 0:
                beta, psi = a2, air - a2
            else:
                psi, beta = track + a2, norm(air - (track + a2))
        else:
            psi = a1
            if angle2 == 1:
                track = psi - a2
                gx, gy = gs * math.cos(track), gs * math.sin(track)
                ax, ay = gx - wx, gy - wy
                tas, air = math.hypot(ax, ay), math.atan2(ay, ax)
                beta = norm(air - psi)
            else:
                beta, air = a2, psi + a2
                along = wx * math.cos(air) + wy * math.sin(air)
                disc = along * along + gs * gs - ws * ws
                if disc < 0:
                    raise ValueError
                tas = -along + math.sqrt(disc)
                ax, ay = tas * math.cos(air), tas * math.sin(air)
                track = math.atan2(ay + wy, ax + wx)
    else:
        if angle1 == 1 and angle2 == 0:
            psi, beta, air = a1, a2, a1 + a2
        else:
            if angle1 == 0:
                track = a1
                if angle2 == 0:
                    beta = a2
                else:
                    psi = track + a2
            else:
                psi, track = a1, a1 - a2
            wnormal = -wx * math.sin(track) + wy * math.cos(track)
            ratio = -wnormal / tas
            if abs(ratio) > 1:
                raise ValueError
            air = track + math.asin(ratio)
            if angle1 == 0 and angle2 == 0:
                psi = air - beta
            else:
                beta = norm(air - psi)
        ax, ay = tas * math.cos(air), tas * math.sin(air)
        gx, gy = ax + wx, ay + wy
        gs, track = math.hypot(gx, gy), math.atan2(gy, gx)
    return tas, gs, psi, beta, track


class TestProductionPhysicsRegressions(unittest.TestCase):
    def test_one_g_vs_does_not_use_maneuver_load_factor(self):
        self.assertIn("Vs_tas=Sqrt(2*weight*9.80665/Rho0/Sref/CLmax)/Sqrt(Rho/Rho0)", COMPACT)
        self.assertNotIn("Vs_tas=Sqrt(2*weight*Nz", COMPACT)

    def test_turn_dynamics_use_tas_not_ground_speed(self):
        self.assertIn("tas*tas/(9.80665*Tan(Bank)*1000)", COMPACT)
        self.assertIn("(9.80665*Tan(Bank))/tas", COMPACT)
        self.assertNotIn("gs*gs/(9.80665*Tan(Bank)*1000)", COMPACT)
        self.assertNotIn("(9.80665*Tan(Bank))/gs", COMPACT)

    def test_temperature_sensor_fahrenheit_conversion(self):
        self.assertIn('btnTempUnit.Text="°F"', COMPACT)
        self.assertIn("kTemp2=9/5", COMPACT)
        self.assertIn("cTemp2=32", COMPACT)

    def test_solver_is_safeguarded_newton_not_historical_update(self):
        self.assertIn("SubPressureAltitudeFromGeometricAltitude", COMPACT)
        self.assertIn("Candidate=Guess-FGuess/Derivative", COMPACT)
        self.assertNotIn("Hp_input_m=Hp_input_m-deriv*Error*relax", COMPACT)
        self.assertNotIn("Error=Abs(Error)", COMPACT)

    def test_density_altitude_uses_standard_density_inverse(self):
        self.assertIn("Hd=DensityAltitudeFromDensity(Rho)/0.3048", COMPACT)
        self.assertIn("SubDensityAltitudeFromDensity", COMPACT)

    def test_atmosphere_matches_independent_reference_dense_grid(self):
        for i in range(5001):
            h = 84852.0 * i / 5000.0
            t, pr = b4a_std(h)
            ref = standard_atmosphere(h)
            self.assertAlmostEqual(t, ref.temperature_k, delta=2e-7)
            self.assertAlmostEqual(pr * P0, ref.pressure_pa, delta=max(2e-3, ref.pressure_pa * 3e-6))

    def test_geometric_altitude_solver_converges_quickly_for_delta_isa(self):
        worst = 0
        for hp in range(0, 20001, 500):
            _, pr = b4a_std(float(hp))
            for disa in range(-40, 41, 5):
                h_geopot = hp - 29.271247 * disa * math.log(pr)
                recovered, iterations = solve_hp(h_geopot, delta_isa=float(disa))
                self.assertAlmostEqual(recovered, hp, delta=0.002)
                worst = max(worst, iterations)
        self.assertLessEqual(worst, 8)

    def test_geometric_altitude_solver_converges_quickly_for_oat(self):
        worst = 0
        for hp in range(0, 20001, 500):
            t_std, pr = b4a_std(float(hp))
            for disa in range(-40, 41, 5):
                oat_c = t_std + disa - 273.15
                h_geopot = hp - 29.271247 * disa * math.log(pr)
                recovered, iterations = solve_hp(h_geopot, oat_c=oat_c)
                self.assertAlmostEqual(recovered, hp, delta=0.002)
                worst = max(worst, iterations)
        self.assertLessEqual(worst, 8)

    def test_density_altitude_round_trip_across_full_model(self):
        # Independent definition: density altitude is standard-atmosphere altitude with equal density.
        grid = [84852.0 * i / 400.0 for i in range(401)]
        densities = [standard_atmosphere(h).density_kg_m3 for h in grid]
        for h, target in zip(grid, densities):
            lo, hi = -5000.0, 84852.0
            for _ in range(40):
                mid = 0.5 * (lo + hi)
                rho_mid = standard_atmosphere(max(0.0, mid)).density_kg_m3 if mid >= 0 else b4a_std(mid)[1] * P0 / (R_AIR * b4a_std(mid)[0])
                if rho_mid > target:
                    lo = mid
                else:
                    hi = mid
            self.assertAlmostEqual(0.5 * (lo + hi), h, delta=0.01)

    def test_all_wind_input_combinations_close_vectorially(self):
        rng = random.Random(200809)
        worst = 0.0
        for use_gs in (False, True):
            for angle1 in (0, 1):
                for angle2 in (0, 1):
                    for _ in range(1000):
                        tas = rng.uniform(40.0, 250.0)
                        psi = rng.uniform(-math.pi, math.pi)
                        beta = rng.uniform(-math.radians(8), math.radians(8))
                        ws = rng.uniform(0.0, 30.0)
                        wd = rng.uniform(-math.pi, math.pi)
                        wx, wy = wind_vector(ws, wd)
                        air = psi + beta
                        ax, ay = tas * math.cos(air), tas * math.sin(air)
                        gx, gy = ax + wx, ay + wy
                        gs, track = math.hypot(gx, gy), math.atan2(gy, gx)
                        drift = norm(psi - track)
                        a1 = track if angle1 == 0 else psi
                        a2 = beta if angle2 == 0 else drift
                        t2, g2, p2, b2, tr2 = solve_wind(tas, gs, use_gs, angle1, angle2, a1, a2, ws, wd)
                        ax2, ay2 = t2 * math.cos(p2 + b2), t2 * math.sin(p2 + b2)
                        gx2, gy2 = g2 * math.cos(tr2), g2 * math.sin(tr2)
                        err = max(abs(ax2 - ax), abs(ay2 - ay), abs(gx2 - gx), abs(gy2 - gy))
                        worst = max(worst, err)
        self.assertLess(worst, 1e-9)

    def test_turn_radius_and_rate_invariants(self):
        for tas in (40.0, 80.0, 120.0, 200.0):
            for bank_deg in (15.0, 30.0, 45.0, 60.0):
                bank = math.radians(bank_deg)
                radius = tas * tas / (G0 * math.tan(bank))
                rate = G0 * math.tan(bank) / tas
                self.assertAlmostEqual(radius * rate, tas, places=12)


if __name__ == "__main__":
    unittest.main()
