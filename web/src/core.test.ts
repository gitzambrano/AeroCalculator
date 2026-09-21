import { describe, expect, it } from "vitest";
import {
  loadFactorFromBank,
  standardAtmosphere,
  pressureToGeopotentialAltitude,
  tasToCas,
  casToTas,
  densityAltitudeFromDensity,
  pressureAltitudeFromGeopotentialAltitude,
  solveWindTriangle,
  temperatureAltitudeFromTemperature,
} from "./core";

describe("independent reference parity", () => {
  it("matches sea-level atmosphere", () => {
    const a = standardAtmosphere(0);
    expect(a.temperatureK).toBeCloseTo(288.15, 10);
    expect(a.pressurePa).toBeCloseTo(101325, 7);
    expect(a.densityKgM3).toBeCloseTo(1.225, 3);
  });

  it("matches documented layer temperatures", () => {
    expect(standardAtmosphere(11000).temperatureK).toBeCloseTo(216.65, 8);
    expect(standardAtmosphere(20000).temperatureK).toBeCloseTo(216.65, 8);
    expect(standardAtmosphere(32000).temperatureK).toBeCloseTo(228.65, 8);
  });

  it("recovers pressure altitude", () => {
    for (const h of [0, 2500, 11000, 18000, 32000, 50000, 80000]) {
      const p = standardAtmosphere(h).pressurePa;
      expect(pressureToGeopotentialAltitude(p)).toBeCloseTo(h, 5);
    }
  });

  it("gives 2 g at 60 degree bank", () => {
    expect(loadFactorFromBank(Math.PI / 3)).toBeCloseTo(2, 12);
  });

  it("round-trips subsonic CAS and TAS", () => {
    const a = standardAtmosphere(5000);
    const tas = 120;
    expect(casToTas(tasToCas(tas, a), a)).toBeCloseTo(tas, 10);
  });

  it("round-trips density altitude through standard density", () => {
    for (const h of [-1000, 0, 5000, 11000, 30000]) {
      expect(densityAltitudeFromDensity(standardAtmosphere(h).densityKgM3)).toBeCloseTo(h, 3);
    }
  });

  it("maps standard sea-level temperature to zero temperature altitude", () => {
    expect(temperatureAltitudeFromTemperature(288.15)).toBeCloseTo(0, 10);
    expect(temperatureAltitudeFromTemperature(216.65)).toBeCloseTo(11000, 10);
  });

  it("recovers geopotential altitude as pressure altitude at ISA", () => {
    for (const h of [0, 2500, 10000, 30000]) {
      const hp = pressureAltitudeFromGeopotentialAltitude(h, { kind: "deltaIsa", deltaK: 0 });
      expect(hp).toBeCloseTo(h, 3);
    }
  });

  it("solves a pure headwind in both TAS-known and GS-known directions", () => {
    const tasKnown = solveWindTriangle({
      knownSpeed: "tas",
      speedMS: 100,
      angle1: "track",
      angle1Rad: 0,
      angle2: "sideslip",
      angle2Rad: 0,
      headwindMS: 20,
      crosswindMS: 0,
      windReferenceRad: 0,
    });
    expect(tasKnown.groundSpeedMS).toBeCloseTo(80, 10);
    expect(tasKnown.headingRad).toBeCloseTo(0, 10);
    expect(tasKnown.alongTrackHeadwindMS).toBeCloseTo(20, 10);

    const gsKnown = solveWindTriangle({
      knownSpeed: "gs",
      speedMS: 80,
      angle1: "track",
      angle1Rad: 0,
      angle2: "sideslip",
      angle2Rad: 0,
      headwindMS: 20,
      crosswindMS: 0,
      windReferenceRad: 0,
    });
    expect(gsKnown.tasMS).toBeCloseTo(100, 10);
  });

  it("crabs into a crosswind while maintaining track", () => {
    const solution = solveWindTriangle({
      knownSpeed: "tas",
      speedMS: 100,
      angle1: "track",
      angle1Rad: 0,
      angle2: "sideslip",
      angle2Rad: 0,
      headwindMS: 0,
      crosswindMS: 20,
      windReferenceRad: 0,
    });
    expect(solution.groundSpeedMS).toBeCloseTo(Math.sqrt(100 ** 2 - 20 ** 2), 10);
    expect(solution.headingRad).toBeCloseTo(Math.asin(0.2), 10);
    expect(solution.trackRad).toBeCloseTo(0, 10);
  });
});
