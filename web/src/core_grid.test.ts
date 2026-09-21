import { describe, expect, it } from "vitest";
import {
  bankFromLoadFactor,
  casToTas,
  densityAltitudeFromDensity,
  geometricToGeopotential,
  geopotentialToGeometric,
  loadFactorFromBank,
  pressureToGeopotentialAltitude,
  solveWindTriangle,
  standardAtmosphere,
  tasToCas,
} from "./core";

describe("deterministic calculation grid", () => {
  it("round-trips pressure altitude across the full modeled atmosphere", () => {
    for (let h = -5000; h <= 80000; h += 2500) {
      const pressure = standardAtmosphere(h).pressurePa;
      expect(pressureToGeopotentialAltitude(pressure)).toBeCloseTo(h, 4);
    }
    const top = standardAtmosphere(84852).pressurePa;
    expect(pressureToGeopotentialAltitude(top)).toBeCloseTo(84852, 4);
  });

  it("round-trips geometric and geopotential altitude on a dense grid", () => {
    for (let h = -2000; h <= 85000; h += 1000) {
      expect(geopotentialToGeometric(geometricToGeopotential(h))).toBeCloseTo(h, 7);
    }
  });

  it("round-trips CAS and TAS throughout the subsonic envelope", () => {
    for (const h of [-1000, 0, 2500, 5000, 10000, 15000, 20000, 30000]) {
      const atmosphere = standardAtmosphere(h);
      for (const mach of [0, 0.05, 0.15, 0.3, 0.5, 0.7, 0.85, 0.95]) {
        const tas = mach * atmosphere.speedOfSoundMS;
        expect(casToTas(tasToCas(tas, atmosphere), atmosphere)).toBeCloseTo(tas, 8);
      }
    }
  });

  it("round-trips density altitude over representative layers", () => {
    for (const h of [-5000, -2500, 0, 2500, 5000, 7500, 11000, 15000, 20000, 30000, 50000, 70000, 84852]) {
      const density = standardAtmosphere(h).densityKgM3;
      expect(densityAltitudeFromDensity(density)).toBeCloseTo(h, 2);
    }
  });

  it("round-trips coordinated-turn bank and load factor", () => {
    for (const degrees of [0, 5, 15, 30, 45, 60, 70, 80]) {
      const bank = degrees * Math.PI / 180;
      const nz = loadFactorFromBank(bank);
      expect(bankFromLoadFactor(nz)).toBeCloseTo(bank, 12);
    }
  });

  it("satisfies wind-vector closure for TAS-known heading/sideslip cases", () => {
    const headings = [-150, -60, 0, 35, 120, 175].map((v) => v * Math.PI / 180);
    const betas = [-8, 0, 6].map((v) => v * Math.PI / 180);
    const winds = [
      { head: 0, cross: 0, ref: 0 },
      { head: 12, cross: 0, ref: 0 },
      { head: 0, cross: 9, ref: 0 },
      { head: 15, cross: -7, ref: 40 * Math.PI / 180 },
    ];

    for (const heading of headings) {
      for (const beta of betas) {
        for (const wind of winds) {
          const tas = 95;
          const result = solveWindTriangle({
            knownSpeed: "tas",
            speedMS: tas,
            angle1: "heading",
            angle1Rad: heading,
            angle2: "sideslip",
            angle2Rad: beta,
            headwindMS: wind.head,
            crosswindMS: wind.cross,
            windReferenceRad: wind.ref,
          });

          const airDirection = heading + beta;
          const uAir = tas * Math.cos(airDirection);
          const vAir = tas * Math.sin(airDirection);
          const uWind = -wind.head * Math.cos(wind.ref) + wind.cross * Math.sin(wind.ref);
          const vWind = -wind.cross * Math.cos(wind.ref) - wind.head * Math.sin(wind.ref);
          const uGround = result.groundSpeedMS * Math.cos(result.trackRad);
          const vGround = result.groundSpeedMS * Math.sin(result.trackRad);

          expect(uGround).toBeCloseTo(uAir + uWind, 9);
          expect(vGround).toBeCloseTo(vAir + vWind, 9);
          expect(result.headingRad).toBeCloseTo(normalize(heading), 10);
          expect(result.sideslipRad).toBeCloseTo(normalize(beta), 10);
        }
      }
    }
  });

  it("satisfies wind-vector closure for GS-known track cases", () => {
    for (const trackDeg of [-160, -45, 0, 70, 160]) {
      const track = trackDeg * Math.PI / 180;
      for (const wind of [
        { head: 10, cross: 0, ref: 0 },
        { head: 0, cross: 8, ref: 0 },
        { head: 11, cross: -6, ref: 25 * Math.PI / 180 },
      ]) {
        const gs = 90;
        const result = solveWindTriangle({
          knownSpeed: "gs",
          speedMS: gs,
          angle1: "track",
          angle1Rad: track,
          angle2: "sideslip",
          angle2Rad: 0,
          headwindMS: wind.head,
          crosswindMS: wind.cross,
          windReferenceRad: wind.ref,
        });

        const uGround = gs * Math.cos(track);
        const vGround = gs * Math.sin(track);
        const uWind = -wind.head * Math.cos(wind.ref) + wind.cross * Math.sin(wind.ref);
        const vWind = -wind.cross * Math.cos(wind.ref) - wind.head * Math.sin(wind.ref);
        const airDirection = result.headingRad + result.sideslipRad;
        const uAir = result.tasMS * Math.cos(airDirection);
        const vAir = result.tasMS * Math.sin(airDirection);

        expect(uAir + uWind).toBeCloseTo(uGround, 9);
        expect(vAir + vWind).toBeCloseTo(vGround, 9);
        expect(result.trackRad).toBeCloseTo(normalize(track), 10);
      }
    }
  });
});

function normalize(angle: number): number {
  let value = angle;
  while (value > Math.PI) value -= 2 * Math.PI;
  while (value <= -Math.PI) value += 2 * Math.PI;
  return Math.abs(value) < 1e-12 ? 0 : value;
}
