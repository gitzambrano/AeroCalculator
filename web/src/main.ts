import "./style.css";
import iconUrl from "./assets/icon-bezel-transp-white.png";
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
  densityAltitudeFromDensity,
  dynamicPressure,
  dynamicViscosity,
  geometricToGeopotential,
  geopotentialToGeometric,
  impactPressureSubsonic,
  impactPressureToMach,
  liftCoefficient,
  loadFactorFromBank,
  pressureAltitudeFromGeopotentialAltitude,
  pressureToGeopotentialAltitude,
  solveWindTriangle,
  stallSpeedTas1g,
  standardAtmosphere,
  tasToCas,
  tasToEas,
  tasToMach,
  temperatureAltitudeFromTemperature,
  units,
  type Atmosphere,
  type TemperatureSpecification,
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
  { id: "spd", typeOptions: opts(["TAS", "CAS", "EAS", "Mach", "CL", "Vs Factor", "Ground Speed", "Qdyn", "Qc"]), unitOptions: opts(["kt", "m/s", "km/h", "mph", "ft/s"]), defaultType: "TAS", defaultUnit: "kt", placeholder: "Speed", defaultValue: "250" },
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
        <img class="brand-icon" src="${iconUrl}" alt="" />
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

  const tail = document.createElement("div");
  tail.className = "input-tail";
  tail.append(unit);

  if (field.id === "spd") {
    const delta = document.createElement("input");
    delta.id = "spdDelta-value";
    delta.className = "value-input calc-control speed-delta";
    delta.inputMode = "decimal";
    delta.autocomplete = "off";
    delta.placeholder = "+ Δkt";
    delta.value = "0";
    delta.hidden = true;
    tail.append(delta);
  }

  row.append(type, value, tail);
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
  const speedDelta = byId("spdDelta-value") as HTMLInputElement;
  const speedInput = byId("spd-value") as HTMLInputElement;
  if (speedType === "Vs Factor") {
    speedUnit.hidden = true;
    speedDelta.hidden = false;
    speedInput.placeholder = "Vs Factor";
  } else {
    speedUnit.hidden = false;
    speedDelta.hidden = true;
    speedInput.placeholder = speedType === "Mach" ? "Mach" : speedType === "CL" ? "Lift coefficient" : "Speed";
    if (speedType === "Mach" || speedType === "CL") {
      preserveSelect(speedUnit, ["—"], "—");
    } else if (speedType === "Qdyn" || speedType === "Qc") {
      preserveSelect(speedUnit, ["mbar", "Pa", "hPa", "atm", "mmHg", "psi"], "Pa");
    } else {
      preserveSelect(speedUnit, ["kt", "m/s", "km/h", "mph", "ft/s"], "kt");
    }
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
    const pressureAltitudeM = resolvePressureAltitude();
    const atmosphere = resolveAtmosphere(pressureAltitudeM);
    const standard = standardAtmosphere(pressureAltitudeM);
    const deltaIsa = atmosphere.temperatureK - standard.temperatureK;

    const altType = selectValue("alt-type");
    let geopotentialAltitudeM: number;
    let geometricAltitudeM: number;
    if (altType === "Hg") {
      geometricAltitudeM = units.lengthToM(num("alt-value"), selectValue("alt-unit"));
      geopotentialAltitudeM = geometricToGeopotential(geometricAltitudeM);
    } else {
      geopotentialAltitudeM = pressureAltitudeM
        - 29.271247 * deltaIsa * Math.log(atmosphere.pressurePa / P0);
      geometricAltitudeM = geopotentialToGeometric(geopotentialAltitudeM);
    }

    const densityAltitudeM = densityAltitudeFromDensity(atmosphere.densityKgM3);
    const temperatureAltitudeM = temperatureAltitudeFromTemperature(atmosphere.temperatureK);

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
      if (nz <= 0) throw new Error("Load factor must be positive.");
      if (nz >= 1) bank = bankFromLoadFactor(nz);
    }

    const vsTas = stallSpeedTas1g(mass, atmosphere.densityKgM3, sref, clmax);
    const vsCas = tasToCas(vsTas, atmosphere);

    const windBase = resolveWindBase();
    const speedType = selectValue("spd-type");
    let tas: number;
    let windSolution;
    if (speedType === "Ground Speed") {
      const gs = units.speedToMS(num("spd-value"), selectValue("spd-unit"));
      windSolution = solveWindTriangle({ ...windBase, knownSpeed: "gs", speedMS: gs });
      tas = windSolution.tasMS;
    } else {
      tas = resolveTas(atmosphere, mass, nz, sref, vsCas);
      windSolution = solveWindTriangle({ ...windBase, knownSpeed: "tas", speedMS: tas });
    }

    const mach = tasToMach(tas, atmosphere.temperatureK);
    if (mach >= 1) throw new Error("The current documented CAS model is subsonic and requires M < 1.");

    const eas = tasToEas(tas, atmosphere.densityKgM3);
    const cas = tasToCas(tas, atmosphere);
    const q = dynamicPressure(tas, atmosphere.densityKgM3);
    const qc = impactPressureSubsonic(mach, atmosphere.pressurePa);
    const totalP = atmosphere.pressurePa + qc;
    const totalT = atmosphere.temperatureK * (1 + 0.5 * (GAMMA - 1) * mach ** 2);
    const mu = dynamicViscosity(atmosphere.temperatureK);
    const cl = liftCoefficient(mass, nz, q, sref);
    const vsFactor = cas / vsCas;
    const reynolds = atmosphere.densityKgM3 * tas * cref / mu;

    const pressureRatio = atmosphere.pressurePa / P0;
    const densityRatio = atmosphere.densityKgM3 / RHO0;
    const tempRatio = atmosphere.temperatureK / T0;
    const turnRadiusM = Math.abs(Math.tan(bank)) > 1e-12 ? tas ** 2 / (G0 * Math.tan(bank)) : Number.NaN;
    const turnRate = tas > 0 ? G0 * Math.tan(bank) / tas : Number.NaN;

    const outputs: Record<string, string> = {
      "Pressure Altitude": formatLength(pressureAltitudeM),
      "Geometric Altitude": formatLength(geometricAltitudeM),
      "Geopotencial Altitude": formatLength(geopotentialAltitudeM),
      "Density Altitude": formatLength(densityAltitudeM),
      "Temperature Altitude": formatLength(temperatureAltitudeM),
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
      "Ground Speed": formatSpeed(windSolution.groundSpeedMS),
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
      "Track Angle": angleText(windSolution.trackRad),
      "Heading Angle Ψ": angleText(windSolution.headingRad),
      "Drift Angle": signedAngleText(windSolution.driftRad),
      "Sideslip Angle β": signedAngleText(windSolution.sideslipRad),
      "Wind Speed": formatSpeed(windSolution.windSpeedMS),
      "Wind Direction": angleText(windSolution.windDirectionRad),
      "AlongTrack Headwind": formatSpeed(windSolution.alongTrackHeadwindMS),
      "AlongTrack Crosswind": formatSpeed(windSolution.alongTrackCrosswindMS),
    };

    renderResults(outputs);
    setStatus(
      `Valid solution · Hp = ${fmt(pressureAltitudeM, 1)} m · M = ${fmt(mach, 3)} · GS = ${fmt(windSolution.groundSpeedMS / (1852 / 3600), 1)} kt`,
      false,
    );
  } catch (error) {
    renderResults({});
    setStatus(error instanceof Error ? error.message : "Unable to calculate.", true);
  }
}

function resolveTemperatureSpecification(): TemperatureSpecification {
  const value = num("temp-value");
  const type = selectValue("temp-type");
  const unit = selectValue("temp-unit");
  return type === "Δ ISA"
    ? { kind: "deltaIsa", deltaK: units.temperatureDeltaToK(value, unit) }
    : { kind: "oat", temperatureK: units.temperatureToK(value, unit) };
}

function resolvePressureAltitude(): number {
  const value = num("alt-value");
  const type = selectValue("alt-type");
  const unit = selectValue("alt-unit");
  if (type === "P") return pressureToGeopotentialAltitude(units.pressureToPa(value, unit));
  const metres = units.lengthToM(value, unit);
  if (type === "Hp") return metres;
  const geopotential = geometricToGeopotential(metres);
  return pressureAltitudeFromGeopotentialAltitude(geopotential, resolveTemperatureSpecification());
}

function resolveAtmosphere(pressureAltitudeM: number): Atmosphere {
  const spec = resolveTemperatureSpecification();
  return spec.kind === "deltaIsa"
    ? deltaIsaState(pressureAltitudeM, spec.deltaK)
    : atmosphereWithTemperature(pressureAltitudeM, spec.temperatureK);
}

function resolveWindBase() {
  const windMode = selectValue("headWind-type");
  return {
    angle1: selectValue("angle1-type") === "Track" ? "track" as const : "heading" as const,
    angle1Rad: units.angleToRad(num("angle1-value"), selectValue("angle1-unit")),
    angle2: selectValue("angle2-type") === "Sideslip" ? "sideslip" as const : "drift" as const,
    angle2Rad: units.angleToRad(num("angle2-value"), selectValue("angle2-unit")),
    headwindMS: units.speedToMS(num("headWind-value"), selectValue("headWind-unit")),
    crosswindMS: windMode === "Wind Speed"
      ? 0
      : units.speedToMS(num("crossWind-value"), selectValue("crossWind-unit")),
    windReferenceRad: units.angleToRad(num("windRef-value"), selectValue("windRef-unit")),
  };
}

function resolveTas(atmosphere: Atmosphere, mass: number, nz: number, sref: number, vsCas: number): number {
  const value = num("spd-value");
  const type = selectValue("spd-type");
  const unit = selectValue("spd-unit");
  let tas: number;
  if (type === "TAS") tas = units.speedToMS(value, unit);
  else if (type === "CAS") tas = casToTas(units.speedToMS(value, unit), atmosphere);
  else if (type === "EAS") tas = units.speedToMS(value, unit) / Math.sqrt(atmosphere.densityKgM3 / RHO0);
  else if (type === "Mach") tas = value * atmosphere.speedOfSoundMS;
  else if (type === "Qdyn") tas = Math.sqrt(2 * units.pressureToPa(value, unit) / atmosphere.densityKgM3);
  else if (type === "Qc") {
    const mach = impactPressureToMach(units.pressureToPa(value, unit), atmosphere.pressurePa);
    tas = mach * atmosphere.speedOfSoundMS;
  } else if (type === "CL") {
    if (value <= 0) throw new Error("CL input must be positive.");
    const q = mass * G0 * nz / (value * sref);
    tas = Math.sqrt(2 * q / atmosphere.densityKgM3);
  } else if (type === "Vs Factor") {
    if (value < 0) throw new Error("Vs Factor cannot be negative.");
    const deltaCas = units.speedToMS(num("spdDelta-value"), "kt");
    const targetCas = value * vsCas + deltaCas;
    if (targetCas < 0) throw new Error("Vs Factor plus Δ speed produces a negative CAS.");
    tas = casToTas(targetCas, atmosphere);
  } else {
    throw new Error("Unsupported speed input.");
  }
  return tas;
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

function fmt(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "----";
  return value.toFixed(digits);
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

function signedAngleText(rad: number): string {
  if (!Number.isFinite(rad)) return "----";
  return `${fmt(rad * 180 / Math.PI, 2)} deg`;
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
