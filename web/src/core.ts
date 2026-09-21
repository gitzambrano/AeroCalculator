export const G0 = 9.80665;
export const R_AIR = 287.05287;
export const GAMMA = 1.4;
export const T0 = 288.15;
export const P0 = 101325.0;
export const RHO0 = 1.225;
export const EARTH_RADIUS_M = 6_356_766.0;

const LAYER_BASES_M = [0, 11_000, 20_000, 32_000, 47_000, 51_000, 71_000, 84_852] as const;
const LAYER_LAPSE = [-0.0065, 0, 0.0010, 0.0028, 0, -0.0028, -0.0020] as const;

export interface Atmosphere {
  geopotentialAltitudeM: number;
  temperatureK: number;
  pressurePa: number;
  densityKgM3: number;
  speedOfSoundMS: number;
}

interface LayerBase {
  H: number;
  T: number;
  p: number;
  lapse: number;
}

function buildLayerBases(): LayerBase[] {
  const values: LayerBase[] = [{ H: 0, T: T0, p: P0, lapse: LAYER_LAPSE[0] }];
  let T = T0;
  let p = P0;
  for (let i = 1; i < LAYER_BASES_M.length - 1; i += 1) {
    const hPrev = LAYER_BASES_M[i - 1];
    const h = LAYER_BASES_M[i];
    const lapse = LAYER_LAPSE[i - 1];
    if (lapse === 0) {
      p *= Math.exp(-G0 * (h - hPrev) / (R_AIR * T));
    } else {
      const newT = T + lapse * (h - hPrev);
      p *= (T / newT) ** (G0 / (R_AIR * lapse));
      T = newT;
    }
    values.push({ H: h, T, p, lapse: LAYER_LAPSE[i] });
  }
  return values;
}

const LAYERS = buildLayerBases();

export function geometricToGeopotential(hM: number): number {
  if (hM <= -EARTH_RADIUS_M) throw new Error("Geometric altitude is outside the model domain.");
  return EARTH_RADIUS_M * hM / (EARTH_RADIUS_M + hM);
}

export function geopotentialToGeometric(HM: number): number {
  if (HM >= EARTH_RADIUS_M) throw new Error("Geopotential altitude is outside the model domain.");
  return EARTH_RADIUS_M * HM / (EARTH_RADIUS_M - HM);
}

export function standardAtmosphere(HM: number): Atmosphere {
  if (HM < 0 || HM > 84_852) throw new Error("Pressure altitude must be between 0 and 84.852 km.");
  let idx = 0;
  for (let i = 0; i < LAYER_BASES_M.length - 1; i += 1) {
    if (HM >= LAYER_BASES_M[i]) idx = i;
  }
  idx = Math.min(idx, LAYERS.length - 1);
  const layer = LAYERS[idx];
  const dH = HM - layer.H;
  let T: number;
  let p: number;
  if (layer.lapse === 0) {
    T = layer.T;
    p = layer.p * Math.exp(-G0 * dH / (R_AIR * layer.T));
  } else {
    T = layer.T + layer.lapse * dH;
    p = layer.p * (layer.T / T) ** (G0 / (R_AIR * layer.lapse));
  }
  const density = p / (R_AIR * T);
  return {
    geopotentialAltitudeM: HM,
    temperatureK: T,
    pressurePa: p,
    densityKgM3: density,
    speedOfSoundMS: Math.sqrt(GAMMA * R_AIR * T),
  };
}

export function pressureToGeopotentialAltitude(pPa: number): number {
  if (pPa <= 0) throw new Error("Pressure must be positive.");
  const minP = standardAtmosphere(84_852).pressurePa;
  if (pPa > P0 || pPa < minP) throw new Error("Pressure is outside the supported atmosphere range.");
  for (let i = 0; i < LAYERS.length; i += 1) {
    const layer = LAYERS[i];
    const top = LAYER_BASES_M[i + 1];
    const pTop = standardAtmosphere(top).pressurePa;
    if (pPa <= layer.p && pPa >= pTop) {
      if (layer.lapse === 0) {
        return layer.H - (R_AIR * layer.T / G0) * Math.log(pPa / layer.p);
      }
      const exponent = -(R_AIR * layer.lapse / G0);
      const T = layer.T * (pPa / layer.p) ** exponent;
      return layer.H + (T - layer.T) / layer.lapse;
    }
  }
  throw new Error("Pressure did not resolve to an atmosphere layer.");
}

export function atmosphereWithTemperature(HM: number, temperatureK: number): Atmosphere {
  const std = standardAtmosphere(HM);
  if (temperatureK <= 0) throw new Error("Absolute temperature must be positive.");
  return {
    geopotentialAltitudeM: HM,
    temperatureK,
    pressurePa: std.pressurePa,
    densityKgM3: std.pressurePa / (R_AIR * temperatureK),
    speedOfSoundMS: Math.sqrt(GAMMA * R_AIR * temperatureK),
  };
}

export function deltaIsaState(HM: number, deltaK: number): Atmosphere {
  const std = standardAtmosphere(HM);
  return atmosphereWithTemperature(HM, std.temperatureK + deltaK);
}

export function tasToMach(tasMS: number, temperatureK: number): number {
  return tasMS / Math.sqrt(GAMMA * R_AIR * temperatureK);
}

export function tasToEas(tasMS: number, densityKgM3: number): number {
  return tasMS * Math.sqrt(densityKgM3 / RHO0);
}

export function impactPressureSubsonic(mach: number, staticPressurePa: number): number {
  if (mach < 0 || mach >= 1) throw new Error("Subsonic impact-pressure relation requires 0 ≤ M < 1.");
  if (staticPressurePa <= 0) throw new Error("Static pressure must be positive.");
  return staticPressurePa * ((1 + 0.5 * (GAMMA - 1) * mach ** 2) ** (GAMMA / (GAMMA - 1)) - 1);
}

export function impactPressureToMach(qcPa: number, staticPressurePa: number): number {
  if (qcPa < 0) throw new Error("Impact pressure cannot be negative.");
  if (staticPressurePa <= 0) throw new Error("Static pressure must be positive.");
  return Math.sqrt(2 / (GAMMA - 1) * ((qcPa / staticPressurePa + 1) ** ((GAMMA - 1) / GAMMA) - 1));
}

export function impactPressureToCas(qcPa: number): number {
  const a0 = Math.sqrt(GAMMA * R_AIR * T0);
  return a0 * impactPressureToMach(qcPa, P0);
}

export function tasToCas(tasMS: number, atmosphere: Atmosphere): number {
  const mach = tasToMach(tasMS, atmosphere.temperatureK);
  return impactPressureToCas(impactPressureSubsonic(mach, atmosphere.pressurePa));
}

export function casToTas(casMS: number, atmosphere: Atmosphere): number {
  const a0 = Math.sqrt(GAMMA * R_AIR * T0);
  const mach0 = casMS / a0;
  const qc = impactPressureSubsonic(mach0, P0);
  const mach = impactPressureToMach(qc, atmosphere.pressurePa);
  if (mach >= 1) throw new Error("The current web core supports subsonic CAS/TAS conversion only.");
  return mach * atmosphere.speedOfSoundMS;
}

export function dynamicPressure(tasMS: number, densityKgM3: number): number {
  return 0.5 * densityKgM3 * tasMS ** 2;
}

export function liftCoefficient(massKg: number, loadFactor: number, qPa: number, srefM2: number): number {
  if (qPa <= 0 || srefM2 <= 0) throw new Error("Dynamic pressure and reference area must be positive.");
  return massKg * G0 * loadFactor / (qPa * srefM2);
}

export function stallSpeedTas1g(massKg: number, densityKgM3: number, srefM2: number, clMax: number): number {
  if (Math.min(massKg, densityKgM3, srefM2, clMax) <= 0) throw new Error("Stall inputs must be positive.");
  return Math.sqrt(2 * massKg * G0 / (densityKgM3 * srefM2 * clMax));
}

export function loadFactorFromBank(bankRad: number): number {
  const c = Math.cos(bankRad);
  if (c <= 0) throw new Error("Level-turn bank must satisfy cos(bank) > 0.");
  return 1 / c;
}

export function bankFromLoadFactor(loadFactor: number): number {
  if (loadFactor < 1) throw new Error("Coordinated level-turn load factor must be ≥ 1.");
  return Math.acos(1 / loadFactor);
}

export function dynamicViscosity(temperatureK: number): number {
  return 1.458e-6 * temperatureK ** 1.5 / (temperatureK + 110.4);
}

export function windComponents(windSpeed: number, windFromRad: number, referenceTrackRad: number): [number, number] {
  const rel = windFromRad - referenceTrackRad;
  return [windSpeed * Math.cos(rel), windSpeed * Math.sin(rel)];
}

export const units = {
  lengthToM(value: number, unit: string): number {
    const f: Record<string, number> = { ft: 0.3048, m: 1, km: 1000, nm: 1852, mi: 1609.344, in: 0.0254 };
    if (!(unit in f)) throw new Error("Unsupported length unit.");
    return value * f[unit];
  },
  pressureToPa(value: number, unit: string): number {
    const f: Record<string, number> = { mbar: 100, Pa: 1, hPa: 100, atm: 101325, mmHg: 133.322387415, psi: 6894.757293168 };
    if (!(unit in f)) throw new Error("Unsupported pressure unit.");
    return value * f[unit];
  },
  temperatureToK(value: number, unit: string): number {
    if (unit === "°C") return value + 273.15;
    if (unit === "°F") return (value - 32) * 5 / 9 + 273.15;
    if (unit === "K") return value;
    throw new Error("Unsupported temperature unit.");
  },
  temperatureDeltaToK(value: number, unit: string): number {
    if (unit === "°F") return value * 5 / 9;
    if (unit === "°C" || unit === "K") return value;
    throw new Error("Unsupported temperature unit.");
  },
  speedToMS(value: number, unit: string): number {
    const f: Record<string, number> = { kt: 1852 / 3600, "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704, "ft/s": 0.3048 };
    if (!(unit in f)) throw new Error("Unsupported speed unit.");
    return value * f[unit];
  },
  massToKg(value: number, unit: string): number {
    const f: Record<string, number> = { kg: 1, lb: 0.45359237, ton: 1000, slug: 14.59390294, oz: 0.028349523125 };
    if (!(unit in f)) throw new Error("Unsupported mass unit.");
    return value * f[unit];
  },
  areaToM2(value: number, unit: string): number {
    const f: Record<string, number> = { "m²": 1, "ft²": 0.09290304, "in²": 0.00064516, "cm²": 1e-4, "mm²": 1e-6 };
    if (!(unit in f)) throw new Error("Unsupported area unit.");
    return value * f[unit];
  },
  angleToRad(value: number, unit: string): number {
    if (unit === "deg") return value * Math.PI / 180;
    if (unit === "rad") return value;
    throw new Error("Unsupported angle unit.");
  },
};
