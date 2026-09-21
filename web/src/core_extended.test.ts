import { describe, expect, it } from "vitest";
import {
  G0,
  P0,
  RHO0,
  T0,
  deltaIsaState,
  dynamicPressure,
  geometricToGeopotential,
  geopotentialToGeometric,
  impactPressureSubsonic,
  impactPressureToMach,
  liftCoefficient,
  loadFactorFromBank,
  standardAtmosphere,
  stallSpeedTas1g,
  tasToCas,
  tasToEas,
  units,
} from "./core";

describe("extended numerical invariants", () => {
  it("keeps ISA continuous at layer boundaries", () => {
    for (const h of [11000, 20000, 32000, 47000, 51000, 71000]) {
      const below = standardAtmosphere(h - 1e-4);
      const at = standardAtmosphere(h);
      const above = standardAtmosphere(h + 1e-4);
      expect(below.temperatureK).toBeCloseTo(at.temperatureK, 5);
      expect(above.temperatureK).toBeCloseTo(at.temperatureK, 5);
      expect(below.pressurePa).toBeCloseTo(at.pressurePa, 2);
      expect(above.pressurePa).toBeCloseTo(at.pressurePa, 2);
    }
  });

  it("round-trips geometric and geopotential altitude", () => {
    for (const h of [0, 1000, 10000, 50000, 85000]) {
      expect(geopotentialToGeometric(geometricToGeopotential(h))).toBeCloseTo(h, 8);
    }
  });

  it("preserves dynamic pressure through TAS/EAS conversion", () => {
    for (const h of [0, 3000, 10000]) {
      const a = standardAtmosphere(h);
      for (const tas of [30, 80, 150, 250]) {
        const eas = tasToEas(tas, a.densityKgM3);
        expect(dynamicPressure(tas, a.densityKgM3)).toBeCloseTo(0.5 * RHO0 * eas ** 2, 8);
      }
    }
  });

  it("round-trips impact pressure and Mach across the subsonic range", () => {
    for (const h of [0, 5000, 11000, 20000]) {
      const p = standardAtmosphere(h).pressurePa;
      for (const mach of [0, 0.1, 0.3, 0.6, 0.85, 0.99]) {
        expect(impactPressureToMach(impactPressureSubsonic(mach, p), p)).toBeCloseTo(mach, 10);
      }
    }
  });

  it("keeps displayed stall speed as the 1-g reference", () => {
    const rho = standardAtmosphere(2500).densityKgM3;
    const expected = Math.sqrt(2 * 1200 * G0 / (rho * 16.2 * 1.55));
    expect(stallSpeedTas1g(1200, rho, 16.2, 1.55)).toBeCloseTo(expected, 10);
  });

  it("matches lift force balance", () => {
    const q = 4200;
    expect(liftCoefficient(1000, 2, q, 20)).toBeCloseTo(1000 * G0 * 2 / (q * 20), 12);
  });

  it("keeps pressure fixed under Delta ISA", () => {
    const standard = standardAtmosphere(7000);
    const hot = deltaIsaState(7000, 20);
    expect(hot.pressurePa).toBeCloseTo(standard.pressurePa, 8);
    expect(hot.temperatureK).toBeCloseTo(standard.temperatureK + 20, 10);
    expect(hot.densityKgM3).toBeLessThan(standard.densityKgM3);
  });

  it("matches authoritative unit conversions", () => {
    expect(units.lengthToM(1, "ft")).toBeCloseTo(0.3048, 12);
    expect(units.lengthToM(1, "nm")).toBeCloseTo(1852, 12);
    expect(units.pressureToPa(1, "atm")).toBe(P0);
    expect(units.speedToMS(1, "kt")).toBeCloseTo(1852 / 3600, 12);
    expect(units.massToKg(1, "lb")).toBeCloseTo(0.45359237, 12);
    expect(units.angleToRad(180, "deg")).toBeCloseTo(Math.PI, 12);
  });

  it("makes CAS equal TAS at standard sea level", () => {
    const a = standardAtmosphere(0);
    for (const tas of [20, 50, 100, 200, 300]) {
      expect(tasToCas(tas, a)).toBeCloseTo(tas, 9);
    }
  });

  it("matches standard reference constants", () => {
    const a = standardAtmosphere(0);
    expect(a.temperatureK).toBe(T0);
    expect(a.pressurePa).toBe(P0);
    expect(a.densityKgM3).toBeCloseTo(RHO0, 3);
    expect(loadFactorFromBank(Math.PI / 3)).toBeCloseTo(2, 12);
  });
});
