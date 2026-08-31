"""Independent numerical reference functions for AeroCalculator verification.

This module is an executable specification. The Android application does not
import it. Keep the formulas independent from the production B4A code.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

G0 = 9.80665
R_AIR = 287.05287
GAMMA = 1.4
T0 = 288.15
P0 = 101325.0
RHO0 = 1.225
EARTH_RADIUS_M = 6_356_766.0

# 1976 US Standard Atmosphere geopotential layers through 84.852 km.
_LAYER_BASES_M = (0.0, 11_000.0, 20_000.0, 32_000.0, 47_000.0, 51_000.0, 71_000.0, 84_852.0)
_LAYER_LAPSE_K_PER_M = (-0.0065, 0.0, 0.0010, 0.0028, 0.0, -0.0028, -0.0020)


@dataclass(frozen=True)
class Atmosphere:
    geopotential_altitude_m: float
    temperature_k: float
    pressure_pa: float
    density_kg_m3: float
    speed_of_sound_m_s: float


def geometric_to_geopotential(h_m: float) -> float:
    if h_m <= -EARTH_RADIUS_M:
        raise ValueError("geometric altitude is outside the model domain")
    return EARTH_RADIUS_M * h_m / (EARTH_RADIUS_M + h_m)


def geopotential_to_geometric(H_m: float) -> float:
    if H_m >= EARTH_RADIUS_M:
        raise ValueError("geopotential altitude is outside the model domain")
    return EARTH_RADIUS_M * H_m / (EARTH_RADIUS_M - H_m)


def _layer_bases() -> tuple[tuple[float, float, float, float], ...]:
    values: list[tuple[float, float, float, float]] = [(0.0, T0, P0, _LAYER_LAPSE_K_PER_M[0])]
    T_b = T0
    p_b = P0
    for i in range(1, len(_LAYER_BASES_M) - 1):
        H_prev = _LAYER_BASES_M[i - 1]
        H_b = _LAYER_BASES_M[i]
        L_prev = _LAYER_LAPSE_K_PER_M[i - 1]
        if L_prev == 0.0:
            p_b *= math.exp(-G0 * (H_b - H_prev) / (R_AIR * T_b))
        else:
            T_new = T_b + L_prev * (H_b - H_prev)
            p_b *= (T_b / T_new) ** (G0 / (R_AIR * L_prev))
            T_b = T_new
        values.append((H_b, T_b, p_b, _LAYER_LAPSE_K_PER_M[i]))
    return tuple(values)


LAYER_BASES = _layer_bases()


def standard_atmosphere(H_m: float) -> Atmosphere:
    if not 0.0 <= H_m <= _LAYER_BASES_M[-1]:
        raise ValueError("geopotential altitude must be between 0 and 84.852 km")

    idx = min(
        max(i for i, base in enumerate(_LAYER_BASES_M[:-1]) if H_m >= base),
        len(LAYER_BASES) - 1,
    )
    H_b, T_b, p_b, L_b = LAYER_BASES[idx]
    dH = H_m - H_b

    if L_b == 0.0:
        T = T_b
        p = p_b * math.exp(-G0 * dH / (R_AIR * T_b))
    else:
        T = T_b + L_b * dH
        p = p_b * (T_b / T) ** (G0 / (R_AIR * L_b))

    rho = p / (R_AIR * T)
    a = math.sqrt(GAMMA * R_AIR * T)
    return Atmosphere(H_m, T, p, rho, a)


def pressure_to_geopotential_altitude(p_pa: float) -> float:
    if p_pa <= 0:
        raise ValueError("pressure must be positive")

    bases = LAYER_BASES
    # Pressure decreases monotonically with altitude.
    if p_pa > P0 or p_pa < standard_atmosphere(_LAYER_BASES_M[-1]).pressure_pa:
        raise ValueError("pressure is outside the supported atmosphere range")

    for i, (H_b, T_b, p_b, L_b) in enumerate(bases):
        H_top = _LAYER_BASES_M[i + 1]
        p_top = standard_atmosphere(H_top).pressure_pa
        if p_top <= p_pa <= p_b:
            if L_b == 0.0:
                return H_b - (R_AIR * T_b / G0) * math.log(p_pa / p_b)
            exponent = -(R_AIR * L_b / G0)
            T = T_b * (p_pa / p_b) ** exponent
            return H_b + (T - T_b) / L_b

    raise ValueError("pressure did not resolve to an atmosphere layer")


def delta_isa_state(H_m: float, delta_isa_k: float) -> Atmosphere:
    std = standard_atmosphere(H_m)
    T = std.temperature_k + delta_isa_k
    if T <= 0:
        raise ValueError("absolute temperature must remain positive")
    rho = std.pressure_pa / (R_AIR * T)
    a = math.sqrt(GAMMA * R_AIR * T)
    return Atmosphere(H_m, T, std.pressure_pa, rho, a)


def tas_to_mach(tas_m_s: float, temperature_k: float) -> float:
    return tas_m_s / math.sqrt(GAMMA * R_AIR * temperature_k)


def tas_to_eas(tas_m_s: float, density_kg_m3: float) -> float:
    return tas_m_s * math.sqrt(density_kg_m3 / RHO0)


def impact_pressure_subsonic(mach: float, static_pressure_pa: float) -> float:
    if not 0.0 <= mach < 1.0:
        raise ValueError("subsonic impact-pressure relation requires 0 <= M < 1")
    return static_pressure_pa * ((1.0 + 0.5 * (GAMMA - 1.0) * mach**2) ** (GAMMA / (GAMMA - 1.0)) - 1.0)


def impact_pressure_to_cas(qc_pa: float) -> float:
    if qc_pa < 0:
        raise ValueError("impact pressure cannot be negative")
    a0 = math.sqrt(GAMMA * R_AIR * T0)
    return a0 * math.sqrt(
        2.0 / (GAMMA - 1.0)
        * ((qc_pa / P0 + 1.0) ** ((GAMMA - 1.0) / GAMMA) - 1.0)
    )


def tas_to_cas(tas_m_s: float, atmosphere: Atmosphere) -> float:
    M = tas_to_mach(tas_m_s, atmosphere.temperature_k)
    return impact_pressure_to_cas(impact_pressure_subsonic(M, atmosphere.pressure_pa))


def dynamic_pressure(tas_m_s: float, density_kg_m3: float) -> float:
    return 0.5 * density_kg_m3 * tas_m_s**2


def lift_coefficient(mass_kg: float, load_factor: float, q_pa: float, sref_m2: float) -> float:
    if q_pa <= 0 or sref_m2 <= 0:
        raise ValueError("dynamic pressure and reference area must be positive")
    return mass_kg * G0 * load_factor / (q_pa * sref_m2)


def stall_speed_tas(mass_kg: float, load_factor: float, density_kg_m3: float, sref_m2: float, cl_max: float) -> float:
    if min(mass_kg, load_factor, density_kg_m3, sref_m2, cl_max) <= 0:
        raise ValueError("stall inputs must be positive")
    return math.sqrt(2.0 * mass_kg * G0 * load_factor / (density_kg_m3 * sref_m2 * cl_max))


def load_factor_from_bank(bank_rad: float) -> float:
    c = math.cos(bank_rad)
    if c <= 0:
        raise ValueError("level-turn bank must satisfy cos(bank) > 0")
    return 1.0 / c


def bank_from_load_factor(load_factor: float) -> float:
    if load_factor < 1.0:
        raise ValueError("coordinated level-turn load factor must be >= 1")
    return math.acos(1.0 / load_factor)


def wind_components(wind_speed: float, wind_to_rad: float, reference_track_rad: float) -> tuple[float, float]:
    """Return signed headwind and crosswind using the current source convention.

    Positive headwind is wind velocity projected along the reference track
    after the source's wind-vector conversion. Crosswind is positive for the
    positive normal component.
    """
    rel = wind_to_rad - reference_track_rad
    return wind_speed * math.cos(rel), wind_speed * math.sin(rel)
