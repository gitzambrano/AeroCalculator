import "./style.css";
import {
  GAMMA,
  G0,
  P0,
  RHO0,
  T0,
  atmosphereWithTemperature,
  bankFromLoadFactor,
  casToTas,
  deltaIsaState,
  dynamicPressure,
  dynamicViscosity,
  geometricToGeopotential,
  geopotentialToGeometric,
  impactPressureSubsonic,
  impactPressureToCas,
  impactPressureToMach,
  liftCoefficient,
  loadFactorFromBank,
  pressureToGeopotentialAltitude,
  stallSpeedTas1g,
  standardAtmosphere,
  tasToCas,
  tasToEas,
  tasToMach,
  units,
  windComponents,
  type Atmosphere,
} from "./core";

type SelectOption = { value: string; label: string };
type Field = {
  id: string;
  typeOptions: SelectOption[];
  unitOptions: SelectOption[];
  defaultType: string;
  defaultUnit: string;
  placeholder?: string;
  defaultValue?: string;
};

const fields: Field[] = [
  { id: "alt", typeOptions: opts(["Hp", "Hg", "P"]), unitOptions: opts(["ft", "m", "km", "nm", "mi", "in"]), defaultType: "Hp", defaultUnit: "ft", placeholder: "Altitude", defaultValue: "10000" },
  { id: "temp", typeOptions: opts(["Δ ISA", "OAT"]), unitOptions: opts(["°C", "°F", "K"]), defaultType: "Δ ISA", defaultUnit: "°C", placeholder: "Temperature", defaultValue: "0" },
  { id: "spd", typeOptions: opts(["TAS", "CAS", "EAS", "Mach", "CL", "Qdyn", "Qc"]), unitOptions: opts(["kt", "m/s", "km/h", "mph", "ft/s"]), defaultType: "TAS", defaultUnit: "kt", placeholder: "Speed", defaultValue: "250" },
  { id: "spdDelta", typeOptions: [{ value: "delta", label: "+ Δ" }], unitOptions: opts(["kt", "m/s", "km/h", "mph", "ft/s"]), defaultType: "delta", defaultUnit: "kt", placeholder: "Speed increment", defaultValue: "0" },
  { id: "weight", typeOptions: opts(["Weight", "MTOW", "MLW", "MZFW", "BOW", "Heavy", "Light"]), unitOptions: opts(["kg", "lb", "ton", "slug", "oz"]), defaultType: "Weight", defaultUnit: "kg", placeholder: "Mass", defaultValue: "10000" },
  { id: "sref", typeOptions: [{ value: "Sref", label: "Sref" }], unitOptions: opts(["m²", "ft²", "in²", "cm²", "mm²"]), defaultType: "Sref", defaultUnit: "m²", placeholder: "Reference area", defaultValue: "30" },
  { id: "cref", typeOptions: [{ value: "cref", label: "cref" }], unitOptions: opts(["m", "ft", "in", "cm", "mm"]), defaultType: "cref", defaultUnit: "m", placeholder: "Reference chord", defaultValue: "2" },
  { id: "clmax", typeOptions: [{ value: "CLmax", label: "CLmax" }], unitOptions: [{ value: "-", label: "—" }], defaultType: "CLmax", defaultUnit: "-", placeholder: "CLmax", defaultValue: "1.5" },
  { id: "nz", typeOptions: [{ value: "Nz", label: "Nz" }, { value: "Bank", label: "Bank" }], unitOptions: opts(["g", "deg"]), defaultType: "Nz", defaultUnit: "g", placeholder: "Load factor", defaultValue: "1" },
  { id: "angle1", typeOptions: opts(["Track", "Heading"]), unitOptions: opts(["deg", "rad"]), defaultType: "Track", defaultUnit: "deg", placeholder: "Angle", defaultValue: "0" },
  { id: "angle2", typeOptions: opts(["Sideslip", "Drift"]), unitOptions: opts(["deg", "rad"]), defaultType: "Sideslip", defaultUnit: "deg", placeholder: "Angle", defaultValue: "0" },
  { id: "headWind", typeOptions: [{ value: "HeadWind", label: "HeadWind" }, { value: "Wind Speed", label: "Wind Speed" }], unitOptions: opts(["kt", "m/s", "km/h", "mph", "ft/s"]), defaultType: "HeadWind", defaultUnit: "kt", placeholder: "Wind", defaultValue: "0" },
  { id: "crossWind", typeOptions: [{ value: "CrossWind", label: "CrossWind" }], unitOptions: opts(["kt", "m/s", "km/h", "mph", "ft/s"]), defaultType: "CrossWind", defaultUnit: "kt", placeholder: "Crosswind", defaultValue: "0" },
  { id: "windRef", typeOptions: [{ value: "Runway Angle", label: "Runway Angle" }, { value: "Wind Direction", label: "Wind Direction" }], unitOptions: opts(["deg", "rad"]), defaultType: "Runway Angle", defaultUnit: "deg", placeholder: "Angle", defaultValue: "0" },
];

const resultNames = [
  "Pressure Altitude", "Geometric Altitude", "Geopotencial Altitude", "Density Altitude", "Temperature Altitude",
  "Pressure", "Density", "Temperature", "Delta ISA", "Total Temperature", "Viscosity", "Sound Speed",
  "True Airspeed", "Calibrated Airspeed", "Equivalent Airspeed", "Ground Speed", "Stall Speed Vs", "Vs Factor",
  "Lift Coefficient CL", "Mach", "Reynolds", "Pressure Ratio δ", "Density Ratio σ", "Temperature Ratio θ",
  "Dynamic Pressure", "Impact Pressure", "Total Pressure", "DynPressure * S / g", "Lift Force", "Weight/Delta W/δ",
  "Load Factor Nz", "Bank Angle φ", "Turn Radius", "Turn Rate", "Track Angle", "Heading Angle Ψ", "Drift Angle",
  "Sideslip Angle β", "Wind Speed", "Wind Direction", "AlongTrack Headwind", "AlongTrack Crosswind",
] as const;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");

app.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <div class="brand-row">
        <img class="brand-icon" src="/icon-bezel-transp-white.png" alt="" />
        <div class="brand">AeroCalculator</div>
        <button class="icon-button" id="add-profile" aria-label="Add airplane">+</button>
        <button class="icon-button" id="more-menu" aria-label="More options">⋮</button>
      </div>
      <nav class="tabs" aria-label="AeroCalculator sections">
        <button class="tab" data-page="airplanes" aria-selected="false">AIRPLANES</button>
        <button class="tab" data-page="inputs" aria-selected="true">INPUTS</button>
        <button class="tab" data-page="calculate" aria-selected="false">CALCULATE</button>
      </nav>
    </header>

    <section id="page-airplanes" class="page airplane-page">
      <div class="airplane-card">
        <h2>Airplanes</h2>
        <p>The web build keeps aircraft data local in the browser. Full Android profile import/export parity is the next migration block.</p>
        <span class="status-pill">Browser-local profiles</span>
      </div>
      <div class="profile-grid">
        <button class="profile-button" type="button"><strong>Generic aircraft</strong><span>Sref 30 m² · cref 2 m · CLmax 1.5</span></button>
      </div>
    </section>

    <section id="page-inputs" class="page active">
      <p class="helper" id="helper">Web calculation core uses the same documented ISA, airspeed and flight-mechanics equations as the Android project.</p>
      <div class="input-list" id="input-list"></div>
    </section>

    <section id="page-calculate" class="page">
      <p class="helper" id="calc-status">Results update from the current inputs.</p>
      <ul class="results" id="results"></ul>
    </section>
  </main>
`;

const inputList = byId("input-list");
for (const field of fields) inputList.append(createInputRow(field));

const resultsList = byId("results");
for (const name of resultNames) {
  const li = document.createElement("li");
  li.className = "result-row";
  li.innerHTML = `<span class="result-name">${name}</span><span class="result-value na" data-result="${name}">----</span>`;
  resultsList.append(li);
}

document.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activatePage(tab.dataset.page ?? "inputs"));
});

document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".calc-control").forEach((el) => {
  el.addEventListener("input", recalculate);
  el.addEventListener("change", () => {
    normalizeDependentUnits();
    recalculate();
  });
});

byId("add-profile").addEventListener("click", () => activatePage("airplanes"));
byId("more-menu").addEventListener("click", () => {
  byId("helper").textContent = "Web preview · TypeScript core · Android visual language.";
  activatePage("inputs");
});

normalizeDependentUnits();
recalculate();

function opts(values: string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

function createInputRow(field: Field): HTMLElement {
  const row = document.createElement("div");
  row.className = "input-row";
  row.dataset.field = field.id;

  const type = document.createElement("select");
  type.id = `${field.id}-type`;
  type.className = "field-select calc-control";
  type.setAttribute("aria-label", `${field.id} quantity`);
  fillSelect(type, field.typeOptions, field.defaultType);

  const value = document.createElement("input");
  value.id = `${field.id}-value`;
  value.className = "value-input calc-control";
  value.inputMode = "decimal";
  value.autocomplete = "off";
  value.placeholder = field.placeholder ?? "";
  value.value = field.defaultValue ?? "";

  const unit = document.createElement("select");
  unit.id = `${field.id}-unit`;
  unit.className = "unit-select calc-control";
  unit.setAttribute("aria-label", `${field.id} unit`);
  fillSelect(unit, field.unitOptions, field.defaultUnit);

  row.append(type, value, unit);
  return row;
}

function fillSelect(select: HTMLSelectElement, options: SelectOption[], selected: string): void {
  select.replaceChildren(...options.map((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    option.selected = item.value === selected;
    return option;
  }));
}

function activatePage(page: string): void {
  document.querySelectorAll<HTMLElement>(".page").forEach((el) => el.classList.toggle("active", el.id === `page-${page}`));
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((el) => el.setAttribute("aria-selected", String(el.dataset.page === page)));
  if (page === "calculate") recalculate();
}

function normalizeDependentUnits(): void {
  const altType = selectValue("alt-type");
  const altUnit = select("alt-unit");
  const altUnits = altType === "P"
    ? ["mbar", "Pa", "hPa", "atm", "mmHg", "psi"]
    : ["ft", "m", "km", "nm", "mi", "in"];
  preserveSelect(altUnit, altUnits, altType === "P" ? "mbar" : "ft");

  const speedType = selectValue("spd-type");
  const speedUnit = select("spd-unit");
  if (speedType === "Mach" || speedType === "CL") {
    preserveSelect(speedUnit, ["—"], "—");
  } else if (speedType === "Qdyn" || speedType === "Qc") {
    preserveSelect(speedUnit, ["mbar", "Pa", "hPa", "atm", "mmHg", "psi"], "Pa");
  } else {
    preserveSelect(speedUnit, ["kt", "m/s", "km/h", "mph", "ft/s"], "kt");
  }

  const nzType = selectValue("nz-type");
  preserveSelect(select("nz-unit"), nzType === "Bank" ? ["deg", "rad"] : ["g"], nzType === "Bank" ? "deg" : "g");

  const windMode = selectValue("headWind-type");
  const cross = byId("crossWind-value") as HTMLInputElement;
  const crossType = select("crossWind-type");
  const windRefType = select("windRef-type");
  if (windMode === "Wind Speed") {
    cross.disabled = true;
    crossType.disabled = true;
    preserveSelect(windRefType, ["Wind Direction"], "Wind Direction");
  } else {
    cross.disabled = false;
    crossType.disabled = false;
    preserveSelect(windRefType, ["Runway Angle"], "Runway Angle");
  }
}

function recalculate(): void {
  try {
    const H = resolveAltitude();
    const atmosphere = resolveAtmosphere(H);
    const mass = units.massToKg(num("weight-value"), selectValue("weight-unit"));
    const sref = units.areaToM2(num("sref-value"), selectValue("sref-unit"));
    const cref = lengthAnyToM(num("cref-value"), selectValue("cref-unit"));
    const clmax = num("clmax-value");

    let bank = 0;
    let nz = 1;
    if (selectValue("nz-type") === "Bank") {
      bank = units.angleToRad(num("nz-value"), selectValue("nz-unit"));
      nz = loadFactorFromBank(bank);
    } else {
      nz = num("nz-value");
      if (nz >= 1) bank = bankFromLoadFactor(nz);
    }

    const tas = resolveTas(atmosphere, mass, nz, sref);
    const mach = tasToMach(tas, atmosphere.temperatureK);
    if (mach >= 1) throw new Error("This first web port intentionally preserves the documented subsonic CAS model (M < 1).");

    const eas = tasToEas(tas, atmosphere.densityKgM3);
    const cas = tasToCas(tas, atmosphere);
    const q = dynamicPressure(tas, atmosphere.densityKgM3);
    const qc = impactPressureSubsonic(mach, atmosphere.pressurePa);
    const totalP = atmosphere.pressurePa + qc;
    const totalT = atmosphere.temperatureK * (1 + 0.5 * (GAMMA - 1) * mach ** 2);
    const mu = dynamicViscosity(atmosphere.temperatureK);
    const cl = liftCoefficient(mass, nz, q, sref);
    const vsTas = stallSpeedTas1g(mass, atmosphere.densityKgM3, sref, clmax);
    const vsCas = tasToCas(vsTas, atmosphere);
    const vsFactor = cas / vsCas;
    const reynolds = atmosphere.densityKgM3 * tas * cref / mu;

    const std = standardAtmosphere(H);
    const deltaIsa = atmosphere.temperatureK - std.temperatureK;
    const geom = geopotentialToGeometric(H);
    const pressureRatio = atmosphere.pressurePa / P0;
    const densityRatio = atmosphere.densityKgM3 / RHO0;
    const tempRatio = atmosphere.temperatureK / T0;

    const angle1 = units.angleToRad(num("angle1-value"), selectValue("angle1-unit"));
    const angle2 = units.angleToRad(num("angle2-value"), selectValue("angle2-unit"));
    let track = selectValue("angle1-type") === "Track" ? angle1 : Number.NaN;
    let heading = selectValue("angle1-type") === "Heading" ? angle1 : Number.NaN;
    let drift = selectValue("angle2-type") === "Drift" ? angle2 : Number.NaN;
    const beta = selectValue("angle2-type") === "Sideslip" ? angle2 : Number.NaN;
    if (Number.isFinite(track) && Number.isFinite(drift)) heading = track + drift;
    if (Number.isFinite(heading) && Number.isFinite(track)) drift = heading - track;

    let windSpeed = Number.NaN;
    let windDirection = Number.NaN;
    let headwind = Number.NaN;
    let crosswind = Number.NaN;
    if (selectValue("headWind-type") === "Wind Speed") {
      windSpeed = units.speedToMS(num("headWind-value"), selectValue("headWind-unit"));
      windDirection = units.angleToRad(num("windRef-value"), selectValue("windRef-unit"));
      const reference = Number.isFinite(track) ? track : 0;
      [headwind, crosswind] = windComponents(windSpeed, windDirection, reference);
    } else {
      headwind = units.speedToMS(num("headWind-value"), selectValue("headWind-unit"));
      crosswind = units.speedToMS(num("crossWind-value"), selectValue("crossWind-unit"));
      windSpeed = Math.hypot(headwind, crosswind);
      const reference = units.angleToRad(num("windRef-value"), selectValue("windRef-unit"));
      windDirection = reference + Math.atan2(crosswind, headwind);
    }

    const turnRadiusM = Math.abs(Math.tan(bank)) > 1e-12 ? tas ** 2 / (G0 * Math.tan(bank)) : Number.NaN;
    const turnRate = tas > 0 ? G0 * Math.tan(bank) / tas : Number.NaN;

    const outputs: Record<string, string> = {
      "Pressure Altitude": formatLength(H),
      "Geometric Altitude": formatLength(geom),
      "Geopotencial Altitude": formatLength(H),
      "Density Altitude": "----",
      "Temperature Altitude": "----",
      "Pressure": formatPressure(atmosphere.pressurePa),
      "Density": `${fmt(atmosphere.densityKgM3, 4)} kg/m³`,
      "Temperature": `${fmt(atmosphere.temperatureK - 273.15, 2)} °C`,
      "Delta ISA": `${fmt(deltaIsa, 2)} °C`,
      "Total Temperature": `${fmt(totalT - 273.15, 2)} °C`,
      "Viscosity": `${mu.toExponential(5)} Pa·s`,
      "Sound Speed": formatSpeed(atmosphere.speedOfSoundMS),
      "True Airspeed": formatSpeed(tas),
      "Calibrated Airspeed": formatSpeed(cas),
      "Equivalent Airspeed": formatSpeed(eas),
      "Ground Speed": "----",
      "Stall Speed Vs": formatSpeed(vsCas),
      "Vs Factor": fmt(vsFactor, 3),
      "Lift Coefficient CL": fmt(cl, 3),
      "Mach": fmt(mach, 3),
      "Reynolds": reynolds.toExponential(4),
      "Pressure Ratio δ": fmt(pressureRatio, 4),
      "Density Ratio σ": fmt(densityRatio, 4),
      "Temperature Ratio θ": fmt(tempRatio, 4),
      "Dynamic Pressure": formatPressure(q),
      "Impact Pressure": formatPressure(qc),
      "Total Pressure": formatPressure(totalP),
      "DynPressure * S / g": `${fmt(q * sref / G0, 1)} kgf`,
      "Lift Force": `${fmt(cl * q * sref / G0, 1)} kgf`,
      "Weight/Delta W/δ": `${fmt(mass / pressureRatio, 1)} kgf`,
      "Load Factor Nz": `${fmt(nz, 2)} g`,
      "Bank Angle φ": `${fmt(bank * 180 / Math.PI, 2)} deg`,
      "Turn Radius": Number.isFinite(turnRadiusM) ? `${fmt(turnRadiusM / 1000, 3)} km` : "----",
      "Turn Rate": Number.isFinite(turnRate) ? `${fmt(turnRate * 180 / Math.PI, 2)} deg/s` : "----",
      "Track Angle": angleText(track),
      "Heading Angle Ψ": angleText(heading),
      "Drift Angle": angleText(drift),
      "Sideslip Angle β": angleText(beta),
      "Wind Speed": formatSpeed(windSpeed),
      "Wind Direction": angleText(windDirection),
      "AlongTrack Headwind": formatSpeed(headwind),
      "AlongTrack Crosswind": formatSpeed(crosswind),
    };

    renderResults(outputs);
    setStatus(`Valid ISA/subsonic solution · H = ${fmt(H, 1)} m · M = ${fmt(mach, 3)}`, false);
  } catch (error) {
    renderResults({});
    setStatus(error instanceof Error ? error.message : "Unable to calculate.", true);
  }
}

function resolveAltitude(): number {
  const value = num("alt-value");
  const type = selectValue("alt-type");
  const unit = selectValue("alt-unit");
  if (type === "P") return pressureToGeopotentialAltitude(units.pressureToPa(value, unit));
  const metres = units.lengthToM(value, unit);
  return type === "Hg" ? geometricToGeopotential(metres) : metres;
}

function resolveAtmosphere(H: number): Atmosphere {
  const value = num("temp-value");
  const type = selectValue("temp-type");
  const unit = selectValue("temp-unit");
  if (type === "Δ ISA") return deltaIsaState(H, units.temperatureDeltaToK(value, unit));
  return atmosphereWithTemperature(H, units.temperatureToK(value, unit));
}

function resolveTas(atmosphere: Atmosphere, mass: number, nz: number, sref: number): number {
  const value = num("spd-value");
  const deltaRaw = num("spdDelta-value");
  const delta = units.speedToMS(deltaRaw, selectValue("spdDelta-unit"));
  const type = selectValue("spd-type");
  const unit = selectValue("spd-unit");
  let tas: number;
  if (type === "TAS") tas = units.speedToMS(value, unit);
  else if (type === "CAS") tas = casToTas(units.speedToMS(value, unit), atmosphere);
  else if (type === "EAS") tas = units.speedToMS(value, unit) / Math.sqrt(atmosphere.densityKgM3 / RHO0);
  else if (type === "Mach") tas = value * atmosphere.speedOfSoundMS;
  else if (type === "Qdyn") tas = Math.sqrt(2 * units.pressureToPa(value, unit) / atmosphere.densityKgM3);
  else if (type === "Qc") {
    const M = impactPressureToMach(units.pressureToPa(value, unit), atmosphere.pressurePa);
    tas = M * atmosphere.speedOfSoundMS;
  } else if (type === "CL") {
    if (value <= 0) throw new Error("CL input must be positive.");
    const q = mass * G0 * nz / (value * sref);
    tas = Math.sqrt(2 * q / atmosphere.densityKgM3);
  } else {
    throw new Error("Unsupported speed input.");
  }
  return tas + delta;
}

function renderResults(values: Record<string, string>): void {
  document.querySelectorAll<HTMLElement>("[data-result]").forEach((el) => {
    const key = el.dataset.result ?? "";
    const value = values[key] ?? "----";
    el.textContent = value;
    el.classList.toggle("na", value === "----");
  });
}

function setStatus(text: string, error: boolean): void {
  const status = byId("calc-status");
  status.textContent = text;
  status.classList.toggle("error", error);
}

function formatLength(m: number): string {
  if (!Number.isFinite(m)) return "----";
  return `${fmt(m / 0.3048, 1)} ft`;
}

function formatSpeed(ms: number): string {
  if (!Number.isFinite(ms)) return "----";
  return `${fmt(ms / (1852 / 3600), 2)} kt`;
}

function formatPressure(pa: number): string {
  if (!Number.isFinite(pa)) return "----";
  return `${fmt(pa / 100, 2)} hPa`;
}

function angleText(rad: number): string {
  if (!Number.isFinite(rad)) return "----";
  const normalized = ((rad * 180 / Math.PI) % 360 + 360) % 360;
  return `${fmt(normalized, 2)} deg`;
}

function lengthAnyToM(value: number, unit: string): number {
  if (unit === "cm") return value / 100;
  if (unit === "mm") return value / 1000;
  return units.lengthToM(value, unit);
}

function preserveSelect(el: HTMLSelectElement, values: string[], fallback: string): void {
  const current = el.value;
  fillSelect(el, opts(values), values.includes(current) ? current : fallback);
}

function num(id: string): number {
  const raw = (byId(id) as HTMLInputElement).value.trim().replace(",", ".");
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Enter a valid number for ${id.replace("-value", "")}.`);
  return value;
}

function selectValue(id: string): string { return select(id).value; }
function select(id: string): HTMLSelectElement { return byId(id) as HTMLSelectElement; }
function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}
