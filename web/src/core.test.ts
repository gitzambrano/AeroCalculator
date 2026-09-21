import { describe, expect, it } from "vitest";
import {
  loadFactorFromBank,
  standardAtmosphere,
  pressureToGeopotentialAltitude,
  tasToCas,
  casToTas,
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
});
