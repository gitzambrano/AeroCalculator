export const PROFILE_STORAGE_KEY = "aerocalculator.profiles.v1";

export const WEIGHT_KEYS = ["MTOW", "MLW", "MZFW", "BOW", "Heavy", "Light"] as const;
export type WeightKey = typeof WEIGHT_KEYS[number];

export interface AircraftProfile {
  id: string;
  name: string;
  sref: number;
  srefUnit: string;
  cref: number;
  crefUnit: string;
  weightUnit: string;
  weights: Partial<Record<WeightKey, number>>;
  clmax: Array<number | null>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function newProfile(id = createId()): AircraftProfile {
  return {
    id,
    name: "",
    sref: 0,
    srefUnit: "m²",
    cref: 0,
    crefUnit: "m",
    weightUnit: "kg",
    weights: {},
    clmax: Array.from({ length: 14 }, () => null),
  };
}

export function loadProfiles(storage: StorageLike): AircraftProfile[] {
  const raw = storage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeProfile).filter((profile): profile is AircraftProfile => profile !== null);
  } catch {
    return [];
  }
}

export function saveProfiles(storage: StorageLike, profiles: AircraftProfile[]): void {
  storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles.map(normalizeForStorage)));
}

export function upsertProfile(profiles: AircraftProfile[], profile: AircraftProfile): AircraftProfile[] {
  const normalized = normalizeProfile(profile);
  if (!normalized) throw new Error("Invalid aircraft profile.");
  const idx = profiles.findIndex((item) => item.id === normalized.id);
  if (idx < 0) return [...profiles, normalized];
  const next = profiles.slice();
  next[idx] = normalized;
  return next;
}

export function deleteProfile(profiles: AircraftProfile[], id: string): AircraftProfile[] {
  return profiles.filter((profile) => profile.id !== id);
}

export function exportProfiles(profiles: AircraftProfile[]): string {
  return JSON.stringify({
    format: "AeroCalculator-Web-Airplanes",
    version: 1,
    profiles: profiles.map(normalizeForStorage),
  }, null, 2);
}

export function importProfiles(text: string): AircraftProfile[] {
  const parsed = JSON.parse(text);
  const source = Array.isArray(parsed) ? parsed : parsed?.profiles;
  if (!Array.isArray(source)) throw new Error("The selected file does not contain AeroCalculator aircraft profiles.");
  const profiles = source.map(normalizeProfile).filter((profile): profile is AircraftProfile => profile !== null);
  if (profiles.length === 0 && source.length > 0) throw new Error("No valid aircraft profiles were found.");
  return profiles;
}

function normalizeForStorage(profile: AircraftProfile): AircraftProfile {
  const normalized = normalizeProfile(profile);
  if (!normalized) throw new Error("Invalid aircraft profile.");
  return normalized;
}

function normalizeProfile(value: unknown): AircraftProfile | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const name = String(obj.name ?? "").trim();
  const id = String(obj.id ?? "").trim();
  if (!id) return null;

  const sref = finiteNumber(obj.sref);
  const cref = finiteNumber(obj.cref);
  if (sref === null || cref === null || sref < 0 || cref < 0) return null;

  const rawWeights = obj.weights && typeof obj.weights === "object"
    ? obj.weights as Record<string, unknown>
    : {};
  const weights: Partial<Record<WeightKey, number>> = {};
  for (const key of WEIGHT_KEYS) {
    const n = finiteNumber(rawWeights[key]);
    if (n !== null && n >= 0) weights[key] = n;
  }

  const rawClmax = Array.isArray(obj.clmax) ? obj.clmax : [];
  const clmax = Array.from({ length: 14 }, (_, index) => {
    const n = finiteNumber(rawClmax[index]);
    return n !== null && n >= 0 ? n : null;
  });

  return {
    id,
    name,
    sref,
    srefUnit: stringOr(obj.srefUnit, "m²"),
    cref,
    crefUnit: stringOr(obj.crefUnit, "m"),
    weightUnit: stringOr(obj.weightUnit, "kg"),
    weights,
    clmax,
  };
}

function finiteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `aircraft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
