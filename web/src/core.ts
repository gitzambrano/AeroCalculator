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
  if (HM < -5_000 || HM > 84_852) throw new Error("Pressure altitude must be between -5 and 84.852 km.");
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
  const maxP = standardAtmosphere(-5_000).pressurePa;
  const minP = standardAtmosphere(84_852).pressurePa;
  if (pPa > maxP || pPa < minP) throw new Error("Pressure is outside the supported atmosphere range.");
  for (let i = 0; i < LAYERS.length; i += 1) {
    const layer = LAYERS[i];
    const top = LAYER_BASES_M[i + 1];
    const pTop = standardAtmosphere(top).pressurePa;
    const pBottom = i === 0 ? maxP : layer.p;
    if (pPa <= pBottom && pPa >= pTop) {
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

export type TemperatureSpecification =
  | { kind: "deltaIsa"; deltaK: number }
  | { kind: "oat"; temperatureK: number };

function localIsaAtPressureAltitude(HM: number, spec: TemperatureSpecification): number {
  const std = standardAtmosphere(HM);
  return spec.kind === "deltaIsa" ? spec.deltaK : spec.temperatureK - std.temperatureK;
}

export function pressureAltitudeFromGeopotentialAltitude(
  geopotentialAltitudeM: number,
  temperature: TemperatureSpecification,
): number {
  const residual = (pressureAltitudeM: number): number => {
    const std = standardAtmosphere(pressureAltitudeM);
    const localIsa = localIsaAtPressureAltitude(pressureAltitudeM, temperature);
    return pressureAltitudeM
      - geopotentialAltitudeM
      - 29.271247 * localIsa * Math.log(std.pressurePa / P0);
  };

  let lower = -5_000;
  let upper = 84_852;
  let fLower = residual(lower);
  const fUpper = residual(upper);
  if (fLower * fUpper > 0) return geopotentialAltitudeM;

  let guess = geopotentialAltitudeM;
  if (guess <= lower || guess >= upper) guess = (lower + upper) / 2;

  for (let i = 0; i < 40; i += 1) {
    const fGuess = residual(guess);
    if (Math.abs(fGuess) <= 0.001) return guess;

    if (fLower * fGuess <= 0) {
      upper = guess;
    } else {
      lower = guess;
      fLower = fGuess;
    }

    const xLower = Math.max(lower, guess - 1);
    const xUpper = Math.min(upper, guess + 1);
    const derivative = xUpper > xLower
      ? (residual(xUpper) - residual(xLower)) / (xUpper - xLower)
      : 0;

    let candidate = Math.abs(derivative) > 1e-9
      ? guess - fGuess / derivative
      : (lower + upper) / 2;
    if (candidate <= lower || candidate >= upper) candidate = (lower + upper) / 2;
    guess = candidate;
  }
  return guess;
}

export function densityAltitudeFromDensity(densityKgM3: number): number {
  if (densityKgM3 <= 0) throw new Error("Density must be positive.");
  let lower = -5_000;
  let upper = 84_852;
  const densityAt = (h: number): number => standardAtmosphere(h).densityKgM3;

  if (densityKgM3 >= densityAt(lower)) return lower;
  if (densityKgM3 <= densityAt(upper)) return upper;

  for (let i = 0; i < 32; i += 1) {
    const midpoint = (lower + upper) / 2;
    if (densityAt(midpoint) > densityKgM3) lower = midpoint;
    else upper = midpoint;
  }
  return (lower + upper) / 2;
}

export function temperatureAltitudeFromTemperature(temperatureK: number): number {
  if (temperatureK <= 0) throw new Error("Absolute temperature must be positive.");
  return temperatureK > 216.65
    ? 11_000 * (288.15 - temperatureK) / 71.5
    : 11_000;
}

export function normalizeSignedAngle(angleRad: number): number {
  let angle = angleRad;
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle <= -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export interface WindTriangleInput {
  knownSpeed: "tas" | "gs";
  speedMS: number;
  angle1: "track" | "heading";
  angle1Rad: number;
  angle2: "sideslip" | "drift";
  angle2Rad: number;
  headwindMS: number;
  crosswindMS: number;
  windReferenceRad: number;
}

export interface WindTriangleSolution {
  tasMS: number;
  groundSpeedMS: number;
  trackRad: number;
  headingRad: number;
  driftRad: number;
  sideslipRad: number;
  windSpeedMS: number;
  windDirectionRad: number;
  alongTrackHeadwindMS: number;
  alongTrackCrosswindMS: number;
}

export function solveWindTriangle(input: WindTriangleInput): WindTriangleSolution {
  const {
    knownSpeed, speedMS, angle1, angle1Rad, angle2, angle2Rad,
    headwindMS, crosswindMS, windReferenceRad,
  } = input;
  if (speedMS < 0) throw new Error("Speed cannot be negative.");

  const uWind = -headwindMS * Math.cos(windReferenceRad) + crosswindMS * Math.sin(windReferenceRad);
  const vWind = -crosswindMS * Math.cos(windReferenceRad) - headwindMS * Math.sin(windReferenceRad);
  const windSpeed = Math.hypot(headwindMS, crosswindMS);
  const windDirection = windSpeed < 1e-12 ? Math.PI : normalizeSignedAngle(Math.atan2(vWind, uWind) + Math.PI);

  let tas = knownSpeed === "tas" ? speedMS : Number.NaN;
  let gs = knownSpeed === "gs" ? speedMS : Number.NaN;
  let track = Number.NaN;
  let heading = Number.NaN;
  let drift = Number.NaN;
  let beta = Number.NaN;
  let airDirection = Number.NaN;
  let uGround = Number.NaN;
  let vGround = Number.NaN;
  let uAir = Number.NaN;
  let vAir = Number.NaN;

  if (knownSpeed === "gs") {
    if (angle1 === "track") {
      track = angle1Rad;
      uGround = gs * Math.cos(track);
      vGround = gs * Math.sin(track);
      uAir = uGround - uWind;
      vAir = vGround - vWind;
      tas = Math.hypot(uAir, vAir);
      airDirection = Math.atan2(vAir, uAir);
      if (angle2 === "sideslip") {
        beta = angle2Rad;
        heading = airDirection - beta;
      } else {
        drift = angle2Rad;
        heading = track + drift;
        beta = normalizeSignedAngle(airDirection - heading);
      }
    } else {
      heading = angle1Rad;
      if (angle2 === "drift") {
        drift = angle2Rad;
        track = heading - drift;
        uGround = gs * Math.cos(track);
        vGround = gs * Math.sin(track);
        uAir = uGround - uWind;
        vAir = vGround - vWind;
        tas = Math.hypot(uAir, vAir);
        airDirection = Math.atan2(vAir, uAir);
        beta = normalizeSignedAngle(airDirection - heading);
      } else {
        beta = angle2Rad;
        airDirection = heading + beta;
        const windAlongAir = uWind * Math.cos(airDirection) + vWind * Math.sin(airDirection);
        const discriminant = windAlongAir ** 2 + gs ** 2 - windSpeed ** 2;
        if (discriminant < -1e-10) {
          throw new Error("Ground speed is incompatible with the selected heading, sideslip, and wind.");
        }
        tas = -windAlongAir + Math.sqrt(Math.max(0, discriminant));
        if (tas < 0) {
          throw new Error("Ground speed is incompatible with the selected heading, sideslip, and wind.");
        }
        uAir = tas * Math.cos(airDirection);
        vAir = tas * Math.sin(airDirection);
        uGround = uAir + uWind;
        vGround = vAir + vWind;
        track = Math.atan2(vGround, uGround);
      }
    }
  } else {
    if (angle1 === "heading" && angle2 === "sideslip") {
      heading = angle1Rad;
      beta = angle2Rad;
      airDirection = heading + beta;
    } else {
      if (angle1 === "track") {
        track = angle1Rad;
        if (angle2 === "sideslip") beta = angle2Rad;
        else {
          drift = angle2Rad;
          heading = track + drift;
        }
      } else {
        heading = angle1Rad;
        drift = angle2Rad;
        track = heading - drift;
      }

      const windNormal = -uWind * Math.sin(track) + vWind * Math.cos(track);
      const ratio = -windNormal / tas;
      if (Math.abs(ratio) > 1 + 1e-12) {
        throw new Error("Selected track cannot be maintained with the current airspeed and wind.");
      }
      airDirection = track + Math.asin(Math.max(-1, Math.min(1, ratio)));
      if (angle1 === "track" && angle2 === "sideslip") heading = airDirection - beta;
      else beta = normalizeSignedAngle(airDirection - heading);
    }

    uAir = tas * Math.cos(airDirection);
    vAir = tas * Math.sin(airDirection);
    uGround = uAir + uWind;
    vGround = vAir + vWind;
    gs = Math.hypot(uGround, vGround);
    track = Math.atan2(vGround, uGround);
  }

  drift = normalizeSignedAngle(heading - track);
  beta = normalizeSignedAngle(beta);
  track = normalizeSignedAngle(track);
  heading = normalizeSignedAngle(heading);

  const alongTrackHeadwind = windSpeed * Math.cos(windDirection - track);
  const alongTrackCrosswind = windSpeed * Math.sin(windDirection - track);

  return {
    tasMS: Math.abs(tas) < 1e-12 ? 0 : tas,
    groundSpeedMS: Math.abs(gs) < 1e-12 ? 0 : gs,
    trackRad: Math.abs(track) < 1e-12 ? 0 : track,
    headingRad: Math.abs(heading) < 1e-12 ? 0 : heading,
    driftRad: Math.abs(drift) < 1e-12 ? 0 : drift,
    sideslipRad: Math.abs(beta) < 1e-12 ? 0 : beta,
    windSpeedMS: Math.abs(windSpeed) < 1e-12 ? 0 : windSpeed,
    windDirectionRad: Math.abs(windDirection) < 1e-12 ? 0 : windDirection,
    alongTrackHeadwindMS: Math.abs(alongTrackHeadwind) < 1e-12 ? 0 : alongTrackHeadwind,
    alongTrackCrosswindMS: Math.abs(alongTrackCrosswind) < 1e-12 ? 0 : alongTrackCrosswind,
  };
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
