import { describe, expect, it } from "vitest";
import {
  PROFILE_STORAGE_KEY,
  deleteProfile,
  duplicateProfile,
  exportAndroidProfiles,
  exportProfiles,
  importAndroidProfiles,
  importProfiles,
  parseProperties,
  loadProfiles,
  newProfile,
  reorderProfile,
  saveProfiles,
  upsertProfile,
  type StorageLike,
} from "./profiles";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

describe("aircraft profiles", () => {
  it("round-trips profiles through browser storage", () => {
    const storage = new MemoryStorage();
    const profile = newProfile("p1");
    profile.name = "Test Jet";
    profile.sref = 42.5;
    profile.weights.MTOW = 12000;
    profile.clmax[0] = 1.42;

    saveProfiles(storage, [profile]);
    expect(storage.getItem(PROFILE_STORAGE_KEY)).not.toBeNull();

    const loaded = loadProfiles(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Test Jet");
    expect(loaded[0].weights.MTOW).toBe(12000);
    expect(loaded[0].clmax[0]).toBe(1.42);
    expect(loaded[0].clmax[1]).toBeNull();
    expect(loaded[0].clmax[13]).toBeNull();
  });

  it("upserts and deletes profiles deterministically", () => {
    const p = newProfile("p1");
    p.name = "A";
    const updated = { ...p, name: "B" };
    expect(upsertProfile([p], updated)).toHaveLength(1);
    expect(upsertProfile([p], updated)[0].name).toBe("B");
    expect(deleteProfile([p], "p1")).toEqual([]);
  });

  it("duplicates an aircraft immediately after the source with independent nested data", () => {
    const a = newProfile("p1");
    a.name = "Legacy 500";
    a.weights.MTOW = 18000;
    a.clmax[0] = 1.5;
    const b = newProfile("p2");
    b.name = "E190-E2";

    const duplicated = duplicateProfile([a, b], "p1");
    expect(duplicated).toHaveLength(3);
    expect(duplicated.map((profile) => profile.name)).toEqual(["Legacy 500", "Legacy 500 Copy", "E190-E2"]);
    expect(duplicated[1].id).not.toBe(a.id);

    duplicated[1].weights.MTOW = 19000;
    duplicated[1].clmax[0] = 1.7;
    expect(duplicated[0].weights.MTOW).toBe(18000);
    expect(duplicated[0].clmax[0]).toBe(1.5);

    const duplicatedAgain = duplicateProfile(duplicated, "p1");
    expect(duplicatedAgain[1].name).toBe("Legacy 500 Copy 2");
  });

  it("reorders aircraft and preserves that order in airplanes.txt export", () => {
    const a = newProfile("p1"); a.name = "A";
    const b = newProfile("p2"); b.name = "B";
    const c = newProfile("p3"); c.name = "C";

    const reordered = reorderProfile([a, b, c], "p3", 0);
    expect(reordered.map((profile) => profile.id)).toEqual(["p3", "p1", "p2"]);

    const text = exportAndroidProfiles(reordered);
    expect(text).toContain("1_Name=C");
    expect(text).toContain("2_Name=A");
    expect(text).toContain("3_Name=B");
  });

  it("round-trips exported JSON", () => {
    const p = newProfile("p1");
    p.name = "Demo";
    p.weights.Heavy = 9000;
    const imported = importProfiles(exportProfiles([p]));
    expect(imported).toHaveLength(1);
    expect(imported[0].weights.Heavy).toBe(9000);
  });

  it("round-trips Android airplanes.txt Java Properties", () => {
    const p = newProfile("p1");
    p.name = "Avião Teste";
    p.sref = 51.2;
    p.srefUnit = "ft²";
    p.cref = 2.4;
    p.crefUnit = "m";
    p.weightUnit = "lb";
    p.weights.MTOW = 12000;
    p.weights.Light = 8000;
    p.clmax[0] = 1.42;
    p.clmax[13] = 2.35;

    const text = exportAndroidProfiles([p]);
    expect(text).toContain("N=1");
    expect(text).toContain("1_Name=Avi\\u00E3o Teste");
    expect(text).toContain("1_Sunit=1");
    expect(text).toContain("1_Wunit=1");

    const imported = importAndroidProfiles(text);
    expect(imported).toHaveLength(1);
    expect(imported[0].name).toBe("Avião Teste");
    expect(imported[0].sref).toBe(51.2);
    expect(imported[0].srefUnit).toBe("ft²");
    expect(imported[0].weights.MTOW).toBe(12000);
    expect(imported[0].weights.Light).toBe(8000);
    expect(imported[0].clmax[0]).toBe(1.42);
    expect(imported[0].clmax[13]).toBe(2.35);
    expect(imported[0].clmax[1]).toBeNull();
    expect(exportAndroidProfiles([imported[0]])).toContain("1_F1=");
  });

  it("parses Java Properties escapes used by B4A", () => {
    const props = parseProperties([
      "# comment",
      String.raw`Key\ With\ Spaces=value\u0020x`,
      String.raw`Path=C\\Temp`,
    ].join("\n"));
    expect(props.get("Key With Spaces")).toBe("value x");
    expect(props.get("Path")).toBe("C\\Temp");
  });

  it("auto-detects Android airplanes.txt during import", () => {
    const imported = importProfiles([
      "N=1",
      "1_Name=Legacy 500",
      "1_S=42",
      "1_c=3",
      "1_W1=18000",
      "1_F0=1.5",
      "1_Sunit=0",
      "1_cunit=0",
      "1_Wunit=0",
    ].join("\n"));
    expect(imported[0].name).toBe("Legacy 500");
    expect(imported[0].weights.MTOW).toBe(18000);
  });
});
