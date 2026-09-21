import "./style.css";
import iconUrl from "./assets/icon-bezel-transp-white.png";
import {
  WEIGHT_KEYS,
  deleteProfile,
  exportProfiles,
  importProfiles,
  loadProfiles,
  newProfile,
  saveProfiles,
  upsertProfile,
  type AircraftProfile,
  type WeightKey,
} from "./profiles";
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
  { id: "weight", typeOptions: opts(["Weight"]), unitOptions: opts(["kg", "lb", "ton", "slug", "oz"]), defaultType: "Weight", defaultUnit: "kg", placeholder: "Mass", defaultValue: "10000" },
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

type OutputSettings = {
  altitude: string;
  pressure: string;
  temperature: string;
  speed: string;
  angle: "deg" | "rad";
  angleFormat: "0/360" | "-180/180";
  extraDecimal: boolean;
  theme: "Green Peace" | "Ancient Brown" | "Dark Shadows" | "Blue Sky" | "Red Alert" | "Orange Juice";
};

const SELECTED_PROFILE_KEY = "aerocalculator.selected-profile.v1";
const SETTINGS_KEY = "aerocalculator.settings.v1";
let settings = loadOutputSettings();
let profiles = loadProfiles(localStorage);
let selectedProfileId = localStorage.getItem(SELECTED_PROFILE_KEY) ?? "custom";
let editingProfileId: string | null = null;
let visibleFlapRows = 0;

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
      <div class="profile-list" id="profile-list"></div>
    </section>

    <section id="page-inputs" class="page active">
      <div class="input-list" id="input-list"></div>
    </section>

    <section id="page-calculate" class="page">
      <p class="status-banner" id="calc-status" hidden></p>
      <ul class="results" id="results"></ul>
    </section>

    <div class="popup-menu" id="main-menu" hidden>
      <button type="button" data-menu="clear">Clear Inputs</button>
      <button type="button" data-menu="import">Import Airplanes</button>
      <button type="button" data-menu="export">Export Airplanes</button>
      <button type="button" data-menu="settings">Settings</button>
      <button type="button" data-menu="feedback">Send Feedback</button>
      <button type="button" data-menu="about">About</button>
    </div>

    <input id="profile-import" type="file" accept=".json,application/json,text/plain" hidden />

    <dialog class="profile-dialog" id="profile-editor">
      <form method="dialog" id="profile-form">
        <div class="editor-toolbar">
          <button type="submit" value="save" id="profile-save">✓&nbsp;&nbsp;Save</button>
          <button type="button" id="profile-cancel">✕&nbsp;&nbsp;Cancel</button>
        </div>
        <div class="editor-scroll">
          <div class="editor-row"><label for="profile-name">Name</label><input id="profile-name" type="text" placeholder="Aircraft Name" /></div>
          <div class="editor-row"><label for="profile-sref">S<sub>REF</sub></label><input id="profile-sref" inputmode="decimal" placeholder="Reference Area" /><select id="profile-sref-unit"><option>m²</option><option>ft²</option><option>in²</option><option>cm²</option><option>mm²</option></select></div>
          <div class="editor-row"><label for="profile-cref">c<sub>REF</sub></label><input id="profile-cref" inputmode="decimal" placeholder="Reference Chord" /><select id="profile-cref-unit"><option>m</option><option>ft</option><option>in</option><option>cm</option><option>mm</option></select></div>
          <section class="editor-section">
            <div class="editor-section-head"><strong>Weight</strong><select id="profile-weight-unit"><option>kg</option><option>lb</option><option>ton</option><option>slug</option><option>oz</option></select></div>
            <div class="weight-grid"><label>MTOW<input id="profile-weight-MTOW" inputmode="decimal" placeholder="MTOW" /></label><label>MLW<input id="profile-weight-MLW" inputmode="decimal" placeholder="MLW" /></label><label>MZFW<input id="profile-weight-MZFW" inputmode="decimal" placeholder="MZFW" /></label><label>BOW<input id="profile-weight-BOW" inputmode="decimal" placeholder="BOW" /></label><label>Heavy<input id="profile-weight-Heavy" inputmode="decimal" placeholder="Heavy" /></label><label>Light<input id="profile-weight-Light" inputmode="decimal" placeholder="Light" /></label></div>
          </section>
          <section class="editor-section">
            <div class="editor-section-head"><strong>CL<sub>MAX</sub></strong><button type="button" id="add-flap" class="add-flap">＋</button></div>
            <div class="flap-grid" id="flap-grid"><label data-flap-row="0" hidden>Flap 0<input id="profile-flap-0" inputmode="decimal" placeholder="Flap 0" /></label><label data-flap-row="1" hidden>Flap 1<input id="profile-flap-1" inputmode="decimal" placeholder="Flap 1" /></label><label data-flap-row="2" hidden>Flap 2<input id="profile-flap-2" inputmode="decimal" placeholder="Flap 2" /></label><label data-flap-row="3" hidden>Flap 3<input id="profile-flap-3" inputmode="decimal" placeholder="Flap 3" /></label><label data-flap-row="4" hidden>Flap 4<input id="profile-flap-4" inputmode="decimal" placeholder="Flap 4" /></label><label data-flap-row="5" hidden>Flap 5<input id="profile-flap-5" inputmode="decimal" placeholder="Flap 5" /></label><label data-flap-row="6" hidden>Flap 6<input id="profile-flap-6" inputmode="decimal" placeholder="Flap 6" /></label><label data-flap-row="7" hidden>Flap 7<input id="profile-flap-7" inputmode="decimal" placeholder="Flap 7" /></label><label data-flap-row="8" hidden>Flap 8<input id="profile-flap-8" inputmode="decimal" placeholder="Flap 8" /></label><label data-flap-row="9" hidden>Flap 9<input id="profile-flap-9" inputmode="decimal" placeholder="Flap 9" /></label><label data-flap-row="10" hidden>Flap 10<input id="profile-flap-10" inputmode="decimal" placeholder="Flap 10" /></label><label data-flap-row="11" hidden>Flap 11<input id="profile-flap-11" inputmode="decimal" placeholder="Flap 11" /></label><label data-flap-row="12" hidden>Flap 12<input id="profile-flap-12" inputmode="decimal" placeholder="Flap 12" /></label><label data-flap-row="13" hidden>Flap 13<input id="profile-flap-13" inputmode="decimal" placeholder="Flap 13" /></label></div>
          </section>
          <div class="editor-actions" id="profile-delete-wrap" hidden>
            <button type="button" class="danger-button" id="profile-delete">Delete Airplane</button>
          </div>
        </div>
      </form>
    </dialog>

    <dialog class="simple-dialog" id="about-dialog">
      <div class="about-content">
        <img src="${iconUrl}" alt="" />
        <h2>AeroCalculator</h2>
        <p>Browser edition</p>
        <p>Gustavo José Zambrano</p>
        <button type="button" data-close-dialog="about-dialog">OK</button>
      </div>
    </dialog>
    <dialog class="settings-dialog simple-dialog" id="settings-dialog">
      <form id="settings-form">
        <h2>Settings</h2>
        <h3>Interface Options</h3>
        <label>Theme<select id="setting-theme">
          <option>Green Peace</option><option>Ancient Brown</option><option>Dark Shadows</option><option>Blue Sky</option><option>Red Alert</option><option>Orange Juice</option>
        </select></label>
        <h3>Output Units and Format</h3>
        <label>Altitude Unit<select id="setting-altitude"><option>ft</option><option>m</option><option>km</option><option>nm</option><option>mi</option><option>in</option></select></label>
        <label>Pressure Unit<select id="setting-pressure"><option>mbar</option><option>Pa</option><option>hPa</option><option>atm</option><option>mmHg</option><option>psi</option></select></label>
        <label>Temperature Unit<select id="setting-temperature"><option>°C</option><option>°F</option><option>K</option></select></label>
        <label>Speed Unit<select id="setting-speed"><option>kt</option><option>m/s</option><option>km/h</option><option>mph</option><option>ft/s</option></select></label>
        <label>Angle Unit<select id="setting-angle"><option>deg</option><option>rad</option></select></label>
        <label>Angle Interval<select id="setting-angle-format"><option value="0/360">0/360 (0/2π)</option><option value="-180/180">-180/180 (-π/π)</option></select></label>
        <label class="check-row"><span>Increase one decimal place</span><input id="setting-extra-decimal" type="checkbox" /></label>
        <div class="dialog-buttons">
          <button type="button" id="settings-cancel">Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </dialog>
  </main>
`;

const inputList = byId("input-list");
inputList.append(createAirplaneRow());
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
    if (el.id === "weight-type" || el.id === "clmax-type") applyProfileNamedValue();
    recalculate();
  });
});

byId("add-profile").addEventListener("click", () => openProfileEditor());
byId("more-menu").addEventListener("click", (event) => {
  event.stopPropagation();
  const menu = byId("main-menu");
  menu.hidden = !menu.hidden;
});
document.addEventListener("click", (event) => {
  const menu = byId("main-menu");
  if (!menu.hidden && !menu.contains(event.target as Node) && event.target !== byId("more-menu")) menu.hidden = true;
});
document.querySelectorAll<HTMLButtonElement>("[data-menu]").forEach((button) => {
  button.addEventListener("click", () => handleMenu(button.dataset.menu ?? ""));
});
byId("profile-cancel").addEventListener("click", closeProfileEditor);
byId("profile-save").addEventListener("click", (event) => {
  event.preventDefault();
  saveProfileFromEditor();
});
byId("profile-delete").addEventListener("click", deleteEditingProfile);
byId("add-flap").addEventListener("click", showNextFlapRow);
(byId("profile-import") as HTMLInputElement).addEventListener("change", importSelectedFile);
document.querySelectorAll<HTMLButtonElement>("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => (byId(button.dataset.closeDialog ?? "") as HTMLDialogElement).close());
});
byId("settings-cancel").addEventListener("click", () => (byId("settings-dialog") as HTMLDialogElement).close());
byId("settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  saveOutputSettings();
});

applyTheme();
renderProfiles();
renderAirplaneSelector();
normalizeDependentUnits();
applyProfileSelection(selectedProfileId, false);
recalculate();

function opts(values: string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

function createAirplaneRow(): HTMLElement {
  const row = document.createElement("div");
  row.className = "input-row airplane-row";

  const label = document.createElement("button");
  label.type = "button";
  label.className = "field-button";
  label.textContent = "Airplane";
  label.addEventListener("click", () => activatePage("airplanes"));

  const picker = document.createElement("select");
  picker.id = "airplane-select";
  picker.className = "profile-select";
  picker.setAttribute("aria-label", "Airplane profile");
  picker.addEventListener("change", () => applyProfileSelection(picker.value));

  row.append(label, picker);
  return row;
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

function renderProfiles(): void {
  const list = byId("profile-list");
  list.replaceChildren();
  for (const profile of profiles) {
    const row = document.createElement("div");
    row.className = "airplane-list-row";

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "airplane-name-button";
    selectButton.innerHTML = `<strong>${escapeHtml(profile.name || "Unnamed Airplane")}</strong><span>${profile.sref} ${profile.srefUnit} · ${profile.cref} ${profile.crefUnit}</span>`;
    selectButton.addEventListener("click", () => {
      applyProfileSelection(profile.id);
      activatePage("inputs");
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "airplane-edit-button";
    editButton.textContent = "✎";
    editButton.setAttribute("aria-label", `Edit ${profile.name}`);
    editButton.addEventListener("click", () => openProfileEditor(profile.id));

    row.append(selectButton, editButton);
    list.append(row);
  }
}

function renderAirplaneSelector(): void {
  const picker = byId("airplane-select") as HTMLSelectElement;
  const options: SelectOption[] = [
    { value: "custom", label: "Custom Airplane" },
    ...profiles.map((profile) => ({ value: profile.id, label: profile.name || "Unnamed Airplane" })),
  ];
  if (selectedProfileId !== "custom" && !profiles.some((p) => p.id === selectedProfileId)) selectedProfileId = "custom";
  fillSelect(picker, options, selectedProfileId);
}

function selectedProfile(): AircraftProfile | undefined {
  return profiles.find((profile) => profile.id === selectedProfileId);
}

function applyProfileSelection(id: string, recalc = true): void {
  selectedProfileId = profiles.some((p) => p.id === id) ? id : "custom";
  localStorage.setItem(SELECTED_PROFILE_KEY, selectedProfileId);
  const picker = document.getElementById("airplane-select") as HTMLSelectElement | null;
  if (picker) picker.value = selectedProfileId;

  const weightSelect = select("weight-type");
  const clSelect = select("clmax-type");
  const profile = selectedProfile();

  if (!profile) {
    preserveSelect(weightSelect, ["Weight"], "Weight");
    preserveSelect(clSelect, ["CLmax"], "CLmax");
  } else {
    (byId("sref-value") as HTMLInputElement).value = String(profile.sref);
    preserveSelect(select("sref-unit"), ["m²", "ft²", "in²", "cm²", "mm²"], profile.srefUnit);
    select("sref-unit").value = profile.srefUnit;
    (byId("cref-value") as HTMLInputElement).value = String(profile.cref);
    preserveSelect(select("cref-unit"), ["m", "ft", "in", "cm", "mm"], profile.crefUnit);
    select("cref-unit").value = profile.crefUnit;

    const weightOptions = ["Weight", ...WEIGHT_KEYS.filter((key) => profile.weights[key] !== undefined)];
    preserveSelect(weightSelect, weightOptions, "Weight");
    const flapOptions = ["CLmax", ...profile.clmax.flatMap((value, index) => value === null ? [] : [`Flap ${index}`])];
    preserveSelect(clSelect, flapOptions, "CLmax");
  }

  if (recalc) recalculate();
}

function applyProfileNamedValue(): void {
  const profile = selectedProfile();
  if (!profile) return;

  const weightType = selectValue("weight-type") as "Weight" | WeightKey;
  if (weightType !== "Weight") {
    const value = profile.weights[weightType];
    if (value !== undefined) {
      (byId("weight-value") as HTMLInputElement).value = String(value);
      preserveSelect(select("weight-unit"), ["kg", "lb", "ton", "slug", "oz"], profile.weightUnit);
      select("weight-unit").value = profile.weightUnit;
    }
  }

  const clType = selectValue("clmax-type");
  if (clType.startsWith("Flap ")) {
    const index = Number(clType.slice(5));
    const value = profile.clmax[index];
    if (value !== null && Number.isFinite(value)) (byId("clmax-value") as HTMLInputElement).value = String(value);
  }
}

function openProfileEditor(id?: string): void {
  editingProfileId = id ?? null;
  const profile = id ? profiles.find((item) => item.id === id) : undefined;
  const source = profile ? structuredClone(profile) : newProfile();

  (byId("profile-name") as HTMLInputElement).value = source.name;
  (byId("profile-sref") as HTMLInputElement).value = source.sref ? String(source.sref) : "";
  (byId("profile-sref-unit") as HTMLSelectElement).value = source.srefUnit;
  (byId("profile-cref") as HTMLInputElement).value = source.cref ? String(source.cref) : "";
  (byId("profile-cref-unit") as HTMLSelectElement).value = source.crefUnit;
  (byId("profile-weight-unit") as HTMLSelectElement).value = source.weightUnit;
  for (const key of WEIGHT_KEYS) {
    (byId(`profile-weight-${key}`) as HTMLInputElement).value =
      source.weights[key] === undefined ? "" : String(source.weights[key]);
  }
  for (let index = 0; index < 14; index += 1) {
    (byId(`profile-flap-${index}`) as HTMLInputElement).value =
      source.clmax[index] === null ? "" : String(source.clmax[index]);
  }

  const lastPopulated = source.clmax.reduce<number>((last, value, index) => value === null ? last : index, -1);
  visibleFlapRows = Math.max(0, lastPopulated + 1);
  renderFlapRows();
  byId("profile-delete-wrap").hidden = !profile;
  (byId("profile-editor") as HTMLDialogElement).showModal();
}

function closeProfileEditor(): void {
  (byId("profile-editor") as HTMLDialogElement).close();
  editingProfileId = null;
}

function showNextFlapRow(): void {
  if (visibleFlapRows < 14) visibleFlapRows += 1;
  renderFlapRows();
}

function renderFlapRows(): void {
  document.querySelectorAll<HTMLElement>("[data-flap-row]").forEach((row) => {
    row.hidden = Number(row.dataset.flapRow) >= visibleFlapRows;
  });
  (byId("add-flap") as HTMLButtonElement).disabled = visibleFlapRows >= 14;
}

function saveProfileFromEditor(): void {
  const current = editingProfileId ? profiles.find((p) => p.id === editingProfileId) : undefined;
  const profile = current ? structuredClone(current) : newProfile();
  profile.name = (byId("profile-name") as HTMLInputElement).value.trim();
  if (!profile.name) {
    (byId("profile-name") as HTMLInputElement).focus();
    return;
  }

  profile.sref = optionalNumber("profile-sref") ?? 0;
  profile.srefUnit = (byId("profile-sref-unit") as HTMLSelectElement).value;
  profile.cref = optionalNumber("profile-cref") ?? 0;
  profile.crefUnit = (byId("profile-cref-unit") as HTMLSelectElement).value;
  profile.weightUnit = (byId("profile-weight-unit") as HTMLSelectElement).value;
  profile.weights = {};
  for (const key of WEIGHT_KEYS) {
    const value = optionalNumber(`profile-weight-${key}`);
    if (value !== null) profile.weights[key] = value;
  }
  profile.clmax = Array.from({ length: 14 }, (_, index) => optionalNumber(`profile-flap-${index}`));

  profiles = upsertProfile(profiles, profile);
  saveProfiles(localStorage, profiles);
  selectedProfileId = profile.id;
  localStorage.setItem(SELECTED_PROFILE_KEY, selectedProfileId);
  renderProfiles();
  renderAirplaneSelector();
  applyProfileSelection(profile.id, false);
  closeProfileEditor();
  activatePage("airplanes");
}

function deleteEditingProfile(): void {
  if (!editingProfileId) return;
  const profile = profiles.find((p) => p.id === editingProfileId);
  if (!profile || !confirm(`Delete ${profile.name}?`)) return;
  profiles = deleteProfile(profiles, editingProfileId);
  saveProfiles(localStorage, profiles);
  if (selectedProfileId === editingProfileId) selectedProfileId = "custom";
  localStorage.setItem(SELECTED_PROFILE_KEY, selectedProfileId);
  renderProfiles();
  renderAirplaneSelector();
  applyProfileSelection(selectedProfileId, false);
  closeProfileEditor();
}

function handleMenu(action: string): void {
  byId("main-menu").hidden = true;
  if (action === "clear") {
    if (confirm("Are you sure you want to clear the inputs?")) clearInputs();
  } else if (action === "import") {
    (byId("profile-import") as HTMLInputElement).click();
  } else if (action === "export") {
    exportProfileFile();
  } else if (action === "settings") {
    openSettings();
  } else if (action === "feedback") {
    window.location.href = "mailto:flightdyn@gmail.com?subject=AeroCalculator%20Feedback";
  } else if (action === "about") {
    (byId("about-dialog") as HTMLDialogElement).showModal();
  }
}

function loadOutputSettings(): OutputSettings {
  const defaults: OutputSettings = {
    altitude: "ft",
    pressure: "mbar",
    temperature: "°C",
    speed: "kt",
    angle: "deg",
    angleFormat: "0/360",
    extraDecimal: false,
    theme: "Green Peace",
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function openSettings(): void {
  (byId("setting-theme") as HTMLSelectElement).value = settings.theme;
  (byId("setting-altitude") as HTMLSelectElement).value = settings.altitude;
  (byId("setting-pressure") as HTMLSelectElement).value = settings.pressure;
  (byId("setting-temperature") as HTMLSelectElement).value = settings.temperature;
  (byId("setting-speed") as HTMLSelectElement).value = settings.speed;
  (byId("setting-angle") as HTMLSelectElement).value = settings.angle;
  (byId("setting-angle-format") as HTMLSelectElement).value = settings.angleFormat;
  (byId("setting-extra-decimal") as HTMLInputElement).checked = settings.extraDecimal;
  (byId("settings-dialog") as HTMLDialogElement).showModal();
}

function saveOutputSettings(): void {
  settings = {
    theme: (byId("setting-theme") as HTMLSelectElement).value as OutputSettings["theme"],
    altitude: (byId("setting-altitude") as HTMLSelectElement).value,
    pressure: (byId("setting-pressure") as HTMLSelectElement).value,
    temperature: (byId("setting-temperature") as HTMLSelectElement).value,
    speed: (byId("setting-speed") as HTMLSelectElement).value,
    angle: (byId("setting-angle") as HTMLSelectElement).value as "deg" | "rad",
    angleFormat: (byId("setting-angle-format") as HTMLSelectElement).value as "0/360" | "-180/180",
    extraDecimal: (byId("setting-extra-decimal") as HTMLInputElement).checked,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyTheme();
  (byId("settings-dialog") as HTMLDialogElement).close();
  recalculate();
}

function applyTheme(): void {
  document.documentElement.dataset.theme = settings.theme;
}

function clearInputs(): void {
  const ids = ["alt","temp","spd","weight","sref","cref","clmax","nz","angle1","angle2","headWind","crossWind","windRef"];
  for (const id of ids) (byId(`${id}-value`) as HTMLInputElement).value = "";
  (byId("spdDelta-value") as HTMLInputElement).value = "";
  recalculate();
}

function exportProfileFile(): void {
  const blob = new Blob([exportProfiles(profiles)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "airplanes.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importSelectedFile(): Promise<void> {
  const input = byId("profile-import") as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    const imported = importProfiles(await file.text());
    for (const profile of imported) profiles = upsertProfile(profiles, profile);
    saveProfiles(localStorage, profiles);
    renderProfiles();
    renderAirplaneSelector();
    activatePage("airplanes");
  } catch (error) {
    alert(error instanceof Error ? error.message : "Unable to import airplanes.");
  }
}

function optionalNumber(id: string): number | null {
  const raw = (byId(id) as HTMLInputElement).value.trim().replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[char] ?? char));
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
      "Temperature": formatTemperature(atmosphere.temperatureK),
      "Delta ISA": formatTemperatureDelta(deltaIsa),
      "Total Temperature": formatTemperature(totalT),
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
      "Turn Rate": Number.isFinite(turnRate) ? formatAngleRate(turnRate) : "----",
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
  status.hidden = !error;
}

function fmt(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "----";
  return value.toFixed(digits + (settings.extraDecimal ? 1 : 0));
}

function formatLength(m: number): string {
  if (!Number.isFinite(m)) return "----";
  const value = m / units.lengthToM(1, settings.altitude);
  return `${fmt(value, 1)} ${settings.altitude}`;
}

function formatSpeed(ms: number): string {
  if (!Number.isFinite(ms)) return "----";
  const value = ms / units.speedToMS(1, settings.speed);
  return `${fmt(value, 2)} ${settings.speed}`;
}

function formatPressure(pa: number): string {
  if (!Number.isFinite(pa)) return "----";
  const value = pa / units.pressureToPa(1, settings.pressure);
  return `${fmt(value, 2)} ${settings.pressure}`;
}

function formatTemperature(kelvin: number): string {
  if (!Number.isFinite(kelvin)) return "----";
  let value = kelvin;
  if (settings.temperature === "°C") value = kelvin - 273.15;
  else if (settings.temperature === "°F") value = (kelvin - 273.15) * 9 / 5 + 32;
  return `${fmt(value, 2)} ${settings.temperature}`;
}

function formatTemperatureDelta(deltaK: number): string {
  if (!Number.isFinite(deltaK)) return "----";
  const value = settings.temperature === "°F" ? deltaK * 9 / 5 : deltaK;
  return `${fmt(value, 2)} ${settings.temperature}`;
}

function outputAngle(rad: number, signed: boolean): number {
  let angle = rad;
  if (!signed && settings.angleFormat === "0/360") {
    angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  } else {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle <= -Math.PI) angle += 2 * Math.PI;
  }
  return settings.angle === "deg" ? angle * 180 / Math.PI : angle;
}

function angleText(rad: number): string {
  if (!Number.isFinite(rad)) return "----";
  return `${fmt(outputAngle(rad, false), 2)} ${settings.angle}`;
}

function signedAngleText(rad: number): string {
  if (!Number.isFinite(rad)) return "----";
  return `${fmt(outputAngle(rad, true), 2)} ${settings.angle}`;
}

function formatAngleRate(radPerSecond: number): string {
  const value = settings.angle === "deg" ? radPerSecond * 180 / Math.PI : radPerSecond;
  return `${fmt(value, 2)} ${settings.angle}/s`;
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
