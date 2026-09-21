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

export function exportAndroidProfiles(profiles: AircraftProfile[]): string {
  const lines: string[] = [];
  lines.push("# AeroCalculator aircraft database");
  lines.push(`N=${profiles.length}`);

  profiles.forEach((profile, index) => {
    const n = index + 1;
    lines.push(propertyLine(`${n}_Name`, profile.name));
    lines.push(propertyLine(`${n}_S`, numberText(profile.sref)));
    lines.push(propertyLine(`${n}_c`, numberText(profile.cref)));
    WEIGHT_KEYS.forEach((key, weightIndex) => {
      lines.push(propertyLine(`${n}_W${weightIndex + 1}`, profile.weights[key] === undefined ? "" : numberText(profile.weights[key]!)));
    });
    for (let flap = 0; flap < 14; flap += 1) {
      const value = profile.clmax[flap];
      lines.push(propertyLine(`${n}_F${flap}`, value === null ? "" : numberText(value)));
    }
    lines.push(propertyLine(`${n}_Sunit`, String(indexOfUnit(profile.srefUnit, ["m²", "ft²", "in²", "cm²", "mm²"]))));
    lines.push(propertyLine(`${n}_cunit`, String(indexOfUnit(profile.crefUnit, ["m", "ft", "in", "cm", "mm"]))));
    lines.push(propertyLine(`${n}_Wunit`, String(indexOfUnit(profile.weightUnit, ["kg", "lb", "ton", "slug", "oz"]))));
  });

  return lines.join("\n") + "\n";
}

export function importProfiles(text: string): AircraftProfile[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    const source = Array.isArray(parsed) ? parsed : parsed?.profiles;
    if (!Array.isArray(source)) throw new Error("The selected file does not contain AeroCalculator aircraft profiles.");
    const profiles = source.map(normalizeProfile).filter((profile): profile is AircraftProfile => profile !== null);
    if (profiles.length === 0 && source.length > 0) throw new Error("No valid aircraft profiles were found.");
    return profiles;
  }

  return importAndroidProfiles(trimmed);
}

export function importAndroidProfiles(text: string): AircraftProfile[] {
  const props = parseProperties(text);
  const count = Math.max(0, Math.trunc(Number(props.get("N") ?? "0")));
  if (!Number.isFinite(count) || count <= 0) throw new Error("The selected file is not a valid AeroCalculator airplanes.txt database.");

  const profiles: AircraftProfile[] = [];
  for (let n = 1; n <= count; n += 1) {
    const profile = newProfile();
    profile.name = props.get(`${n}_Name`) ?? "";
    profile.sref = nonNegativeNumber(props.get(`${n}_S`)) ?? 0;
    profile.cref = nonNegativeNumber(props.get(`${n}_c`)) ?? 0;
    profile.srefUnit = unitFromIndex(props.get(`${n}_Sunit`), ["m²", "ft²", "in²", "cm²", "mm²"], "m²");
    profile.crefUnit = unitFromIndex(props.get(`${n}_cunit`), ["m", "ft", "in", "cm", "mm"], "m");
    profile.weightUnit = unitFromIndex(props.get(`${n}_Wunit`), ["kg", "lb", "ton", "slug", "oz"], "kg");

    WEIGHT_KEYS.forEach((key, weightIndex) => {
      const value = nonNegativeNumber(props.get(`${n}_W${weightIndex + 1}`));
      if (value !== null) profile.weights[key] = value;
    });
    profile.clmax = Array.from({ length: 14 }, (_, flap) => nonNegativeNumber(props.get(`${n}_F${flap}`)));

    if (profile.name || profile.sref > 0 || profile.cref > 0 || Object.keys(profile.weights).length > 0 || profile.clmax.some((value) => value !== null)) {
      profiles.push(profile);
    }
  }

  if (profiles.length === 0) throw new Error("No valid aircraft profiles were found.");
  return profiles;
}

export function parseProperties(text: string): Map<string, string> {
  const result = new Map<string, string>();
  const physicalLines = text.replace(/\r\n?/g, "\n").split("\n");
  const logicalLines: string[] = [];

  for (let i = 0; i < physicalLines.length; i += 1) {
    let line = physicalLines[i];
    while (hasContinuation(line) && i + 1 < physicalLines.length) {
      line = line.slice(0, -1) + physicalLines[++i].replace(/^[ \t\f]+/, "");
    }
    logicalLines.push(line);
  }

  for (const rawLine of logicalLines) {
    const line = rawLine.replace(/^[ \t\f]+/, "");
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;

    let separator = -1;
    let escaped = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (!escaped && (ch === "=" || ch === ":" || /[ \t\f]/.test(ch))) {
        separator = i;
        break;
      }
      if (ch === "\\") escaped = !escaped;
      else escaped = false;
    }

    let rawKey = separator < 0 ? line : line.slice(0, separator);
    let valueStart = separator < 0 ? line.length : separator;
    while (valueStart < line.length && /[ \t\f]/.test(line[valueStart])) valueStart += 1;
    if (valueStart < line.length && (line[valueStart] === "=" || line[valueStart] === ":")) valueStart += 1;
    while (valueStart < line.length && /[ \t\f]/.test(line[valueStart])) valueStart += 1;
    const rawValue = line.slice(valueStart);

    rawKey = rawKey.replace(/[ \t\f]+$/, "");
    result.set(unescapeProperty(rawKey), unescapeProperty(rawValue));
  }

  return result;
}

function hasContinuation(line: string): boolean {
  let slashes = 0;
  for (let i = line.length - 1; i >= 0 && line[i] === "\\"; i -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function unescapeProperty(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    if (++i >= value.length) {
      out += "\\";
      break;
    }
    const esc = value[i];
    if (esc === "t") out += "\t";
    else if (esc === "n") out += "\n";
    else if (esc === "r") out += "\r";
    else if (esc === "f") out += "\f";
    else if (esc === "u" && /^[0-9a-fA-F]{4}$/.test(value.slice(i + 1, i + 5))) {
      out += String.fromCharCode(parseInt(value.slice(i + 1, i + 5), 16));
      i += 4;
    } else out += esc;
  }
  return out;
}

function propertyLine(key: string, value: string): string {
  return `${escapeProperty(key, true)}=${escapeProperty(value, false)}`;
}

function escapeProperty(value: string, isKey: boolean): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    const code = ch.charCodeAt(0);
    if (ch === "\\") out += "\\\\";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\f") out += "\\f";
    else if ((isKey && /[ =:#!]/.test(ch)) || (!isKey && i === 0 && ch === " ")) out += "\\" + ch;
    else if (code < 0x20 || code > 0x7e) out += `\\u${code.toString(16).toUpperCase().padStart(4, "0")}`;
    else out += ch;
  }
  return out;
}

function nonNegativeNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const number = Number(value.trim().replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function indexOfUnit(value: string, units: readonly string[]): number {
  const index = units.indexOf(value);
  return index < 0 ? 0 : index;
}

function unitFromIndex(value: string | undefined, units: readonly string[], fallback: string): string {
  const index = Math.trunc(Number(value ?? "0"));
  return Number.isInteger(index) && index >= 0 && index < units.length ? units[index] : fallback;
}

function numberText(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
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
