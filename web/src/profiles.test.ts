import { describe, expect, it } from "vitest";
import {
  PROFILE_STORAGE_KEY,
  deleteProfile,
  exportProfiles,
  importProfiles,
  loadProfiles,
  newProfile,
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
  });

  it("upserts and deletes profiles deterministically", () => {
    const p = newProfile("p1");
    p.name = "A";
    const updated = { ...p, name: "B" };
    expect(upsertProfile([p], updated)).toHaveLength(1);
    expect(upsertProfile([p], updated)[0].name).toBe("B");
    expect(deleteProfile([p], "p1")).toEqual([]);
  });

  it("round-trips exported JSON", () => {
    const p = newProfile("p1");
    p.name = "Demo";
    p.weights.Heavy = 9000;
    const imported = importProfiles(exportProfiles([p]));
    expect(imported).toHaveLength(1);
    expect(imported[0].weights.Heavy).toBe(9000);
  });
});
