import "./style.css";
import { CATALOG } from "./catalog";
import { renderEquationLaTeX } from "./math-renderer";
import iconUrl from "./assets/icon-bezel-transp-white.png";
import {
  WEIGHT_KEYS,
  deleteProfile,
  duplicateProfile,
  exportAndroidProfiles,
  importProfiles,
  loadProfiles,
  newProfile,
  reorderProfile,
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

const PAGE_ORDER = ["airplanes", "inputs", "calculate"] as const;

let lastVibrateTime = 0;
function vibrateTap(): void {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastVibrateTime < 50) return;
  lastVibrateTime = now;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(12);
    } catch (_) {}
  }
}

const FIELD_HELPERS: Record<string, string> = {
  "Hp": "Pressure altitude: altitude in the ISA atmosphere corresponding to the entered static pressure.",
  "Hg": "Geometric altitude: physical height above mean sea level.",
  "P": "Static atmospheric pressure. AeroCalculator converts it to pressure altitude.",
  "Δ ISA": "Temperature deviation from the ISA temperature at the current pressure altitude.",
  "OAT": "Outside air temperature at the aircraft condition.",
  "TAS": "True Airspeed: aircraft speed relative to the surrounding air mass.",
  "CAS": "Calibrated Airspeed: indicated airspeed corrected for instrument/position error and compressibility using the standard sea-level reference.",
  "EAS": "Equivalent Airspeed: speed at standard sea-level density with the same dynamic pressure as the current flight condition.",
  "Mach": "Mach number: True Airspeed divided by the local speed of sound.",
  "CL": "Lift coefficient. With mass, load factor and reference area, it defines the required dynamic pressure.",
  "Vs Factor": "Multiplier applied to the 1-g calibrated stall speed. The optional +Δ term is added in knots.",
  "Ground Speed": "Aircraft speed relative to the ground. Wind and direction inputs are used to recover the air-relative velocity.",
  "Qdyn": "Dynamic pressure for the current air density and true airspeed.",
  "Qc": "Impact pressure: total pressure minus static pressure for the documented subsonic model.",
  "Weight": "Aircraft mass used for lift, stall-speed and maneuver calculations.",
  "Sref": "Wing reference area used in aerodynamic force and coefficient calculations.",
  "cref": "Wing reference chord used to calculate Reynolds number.",
  "CLmax": "Maximum lift coefficient used to calculate the 1-g stall speed.",
  "NzPullup": "Normal load factor for a pull-up maneuver. Bank angle is zero.",
  "NzTurn": "Normal load factor in a coordinated level turn. Bank angle is derived from n = 1/cos(φ).",
  "BankTurn": "Bank angle for a coordinated level turn. Load factor is derived from n = 1/cos(φ).",
  "Track": "Track angle: direction of the ground-velocity vector.",
  "Heading": "Heading angle: direction the aircraft longitudinal axis points.",
  "Sideslip": "Sideslip angle β: angle between the aircraft heading and the air-relative velocity direction.",
  "Drift": "Drift angle: heading minus track.",
  "HeadWind": "Wind component along the selected runway/reference direction. Positive means headwind.",
  "Wind Speed": "Wind-vector magnitude. Use Wind Direction for its direction.",
  "CrossWind": "Wind component perpendicular to the selected runway/reference direction.",
  "Runway Angle": "Reference direction used to resolve headwind and crosswind components.",
  "Wind Direction": "Direction from which the wind is referenced in the wind-vector input mode.",
};

function helperFor(fieldId: string, typeValue: string): string {
  return FIELD_HELPERS[typeValue] ?? {
    alt: "Altitude or pressure input used to define the atmospheric state.",
    temp: "Temperature input used to define the atmospheric state.",
    spd: "Primary speed or aerodynamic quantity used to determine airspeed.",
    weight: "Aircraft mass.",
    sref: "Wing reference area.",
    cref: "Wing reference chord.",
    clmax: "Maximum lift coefficient.",
    nz: "Maneuver load-factor or bank-angle input.",
    angle1: "Primary aircraft/ground direction angle.",
    angle2: "Secondary aerodynamic/ground direction angle.",
    headWind: "Wind input.",
    crossWind: "Crosswind input.",
    windRef: "Wind reference direction.",
  }[fieldId] ?? "AeroCalculator input.";
}

const DEFAULT_OPTION_LABELS: Record<string, string> = {
  Hp: "Altitude H<sub class='hp-sub'>p</sub>",
  Hg: "Altitude H<sub>geom</sub>",
  P: "Static Pressure",
  OAT: "Temperature OAT",
  TAS: "Airspeed TAS",
  CAS: "Airspeed CAS",
  EAS: "Airspeed EAS",
  CL: "Lift Coefficient C<sub>L</sub>",
  "Vs Factor": "V<sub>s</sub> Factor",
  Qdyn: "Dynamic Pressure q",
  Qc: "Impact Pressure q<sub>c</sub>",
  Sref: "Area S<sub>ref</sub>",
  cref: "Chord c<sub>ref</sub>",
  CLmax: "Flap 0 - C<sub>L,max</sub>",
  NzPullup: "N<sub>z</sub>&nbsp;(Pull-up)",
  NzTurn: "N<sub>z</sub>&nbsp;(Turn)",
  BankTurn: "Bank Angle",
  Track: "Track Angle",
  Heading: "Heading Angle",
  Sideslip: "Sideslip Angle",
  Drift: "Drift Angle",
  "Runway Angle": "Runway Angle",
};

function opts(values: string[]): SelectOption[] {
  return values.map((value) => ({ value, label: DEFAULT_OPTION_LABELS[value] ?? value }));
}

const fields: Field[] = [
  { id: "alt", typeOptions: opts(["Hp", "Hg", "P"]), unitOptions: opts(["ft", "m", "km", "nm", "mi", "in"]), defaultType: "Hp", defaultUnit: "ft", placeholder: "Altitude", defaultValue: "0" },
  { id: "temp", typeOptions: opts(["Δ ISA", "OAT"]), unitOptions: opts(["°C", "°F", "K"]), defaultType: "OAT", defaultUnit: "°C", placeholder: "Temperature", defaultValue: "0" },
  { id: "spd", typeOptions: opts(["TAS", "CAS", "EAS", "Mach", "CL", "Vs Factor", "Ground Speed", "Qdyn", "Qc"]), unitOptions: opts(["kt", "m/s", "km/h", "mph", "ft/s"]), defaultType: "CAS", defaultUnit: "kt", placeholder: "Speed", defaultValue: "0" },
  { id: "weight", typeOptions: opts(["Weight"]), unitOptions: opts(["kg", "lb", "ton", "slug", "oz"]), defaultType: "Weight", defaultUnit: "kg", placeholder: "Mass", defaultValue: "1" },
  { id: "sref", typeOptions: [{ value: "Sref", label: "Area S<sub>ref</sub>" }], unitOptions: opts(["m²", "ft²", "in²", "cm²", "mm²"]), defaultType: "Sref", defaultUnit: "m²", placeholder: "Reference area", defaultValue: "1" },
  { id: "cref", typeOptions: [{ value: "cref", label: "Chord c<sub>ref</sub>" }], unitOptions: opts(["m", "ft", "in", "cm", "mm"]), defaultType: "cref", defaultUnit: "m", placeholder: "Reference chord", defaultValue: "1" },
  { id: "clmax", typeOptions: [{ value: "CLmax", label: "Flap 0 - C<sub>L,max</sub>" }], unitOptions: [{ value: "-", label: "—" }], defaultType: "CLmax", defaultUnit: "-", placeholder: "Maximum lift coefficient", defaultValue: "1" },
  { id: "nz", typeOptions: [{ value: "NzPullup", label: "N<sub>z</sub>&nbsp;(Pull-up)" }, { value: "NzTurn", label: "N<sub>z</sub>&nbsp;(Turn)" }, { value: "BankTurn", label: "Bank Angle" }], unitOptions: opts(["g", "deg"]), defaultType: "NzPullup", defaultUnit: "g", placeholder: "Load factor", defaultValue: "1" },
  { id: "angle1", typeOptions: opts(["Track", "Heading"]), unitOptions: opts(["deg", "rad"]), defaultType: "Track", defaultUnit: "deg", placeholder: "Angle", defaultValue: "0" },
  { id: "angle2", typeOptions: opts(["Sideslip", "Drift"]), unitOptions: opts(["deg", "rad"]), defaultType: "Sideslip", defaultUnit: "deg", placeholder: "Angle", defaultValue: "0" },
  { id: "headWind", typeOptions: [{ value: "HeadWind", label: "HeadWind" }, { value: "Wind Speed", label: "Wind Speed" }], unitOptions: opts(["kt", "m/s", "km/h", "mph", "ft/s"]), defaultType: "HeadWind", defaultUnit: "kt", placeholder: "Wind", defaultValue: "0" },
  { id: "crossWind", typeOptions: [{ value: "CrossWind", label: "CrossWind" }], unitOptions: opts(["kt", "m/s", "km/h", "mph", "ft/s"]), defaultType: "CrossWind", defaultUnit: "kt", placeholder: "Crosswind", defaultValue: "0" },
  { id: "windRef", typeOptions: [{ value: "Runway Angle", label: "Runway Angle" }, { value: "Wind Direction", label: "Wind Direction" }], unitOptions: opts(["deg", "rad"]), defaultType: "Runway Angle", defaultUnit: "deg", placeholder: "Angle", defaultValue: "0" },
];


const resultNames = [
  "Pressure Altitude", "Geometric Altitude", "Geopotential Altitude", "Density Altitude", "Temperature Altitude",
  "Pressure", "Density", "Temperature", "Delta ISA", "Total Temperature", "Viscosity", "Sound Speed",
  "True Airspeed", "Calibrated Airspeed", "Equivalent Airspeed", "Ground Speed", "Stall Speed Vs", "Vs Factor",
  "Lift Coefficient CL", "Mach", "Reynolds", "Pressure Ratio δ", "Density Ratio σ", "Temperature Ratio θ",
  "Dynamic Pressure", "Impact Pressure", "Total Pressure", "DynPressure * S / g", "Lift Force", "Weight/Delta W/δ",
  "Load Factor Nz", "Bank Angle φ", "Turn Radius", "Turn Rate", "Track Angle", "Heading Angle Ψ", "Drift Angle",
  "Sideslip Angle β", "Wind Speed", "Wind Direction", "AlongTrack Headwind", "AlongTrack Crosswind",
] as const;

// Static trusted markup is used here only for mathematical subscript typography.
const RESULT_DISPLAY_LABELS: Partial<Record<(typeof resultNames)[number], string>> = {
  "Pressure Altitude": "Pressure Altitude H<sub class='hp-sub'>p</sub>",
  "Geometric Altitude": "Geometric Altitude H<sub>geom</sub>",
  "Geopotential Altitude": "Geopotential Altitude H<sub>g</sub>",
  "Density Altitude": "Density Altitude H<sub>ρ</sub>",
  "Temperature Altitude": "Temperature Altitude H<sub>T</sub>",
  "Pressure": "Pressure p",
  "Density": "Density ρ",
  "Temperature": "Temperature T",
  "Delta ISA": "Δ ISA",
  "Total Temperature": "Total Temperature T<sub>t</sub>",
  "Viscosity": "Viscosity μ",
  "Sound Speed": "Sound Speed a",
  "Stall Speed Vs": "Stall Speed V<sub>s</sub>",
  "Vs Factor": "V<sub>s</sub> Factor",
  "Lift Coefficient CL": "Lift Coefficient C<sub>L</sub>",
  "Reynolds": "Reynolds Re",
  "Dynamic Pressure": "Dynamic Pressure q",
  "Impact Pressure": "Impact Pressure q<sub>c</sub>",
  "Total Pressure": "Total Pressure p<sub>t</sub>",
  "DynPressure * S / g": "q S / g₀",
  "Weight/Delta W/δ": "Weight / δ",
  "Load Factor Nz": "Load Factor N<sub>z</sub>",
  "AlongTrack Headwind": "Along-Track Headwind",
  "AlongTrack Crosswind": "Along-Track Crosswind",
};

const RESULT_HELPERS: Record<string, string> = {
  "Pressure Altitude": "Pressure altitude Hₚ: ISA altitude corresponding to static pressure.",
  "Geometric Altitude": "Geometric altitude: physical height above mean sea level.",
  "Geopotential Altitude": "Geopotential altitude used by the standard-atmosphere model.",
  "Density Altitude": "ISA altitude with the same air density as the current condition.",
  "Temperature Altitude": "Altitude returned by the documented ISA temperature-altitude convention.",
  "Pressure": "Static atmospheric pressure.",
  "Density": "Air density: mass of air per unit volume.",
  "Temperature": "Outside air temperature.",
  "Delta ISA": "Temperature deviation from the ISA temperature at the current pressure altitude.",
  "Total Temperature": "Total temperature Tₜ for the documented isentropic model.",
  "Viscosity": "Dynamic air viscosity from the documented temperature correlation.",
  "Sound Speed": "Local speed of sound in the ideal-gas model.",
  "True Airspeed": "Aircraft speed relative to the surrounding air mass.",
  "Calibrated Airspeed": "Calibrated airspeed from the documented pitot-static model.",
  "Equivalent Airspeed": "Airspeed at standard sea-level density with the same dynamic pressure.",
  "Ground Speed": "Aircraft speed relative to the ground.",
  "Stall Speed Vs": "Reference 1-g stall speed Vₛ.",
  "Vs Factor": "Multiplier applied to the reference 1-g stall speed.",
  "Lift Coefficient CL": "Required lift coefficient for the selected condition.",
  "Mach": "True airspeed divided by the local speed of sound.",
  "Reynolds": "Reynolds number based on the reference chord.",
  "Pressure Ratio δ": "Static pressure divided by standard sea-level pressure.",
  "Density Ratio σ": "Air density divided by standard sea-level density.",
  "Temperature Ratio θ": "Absolute temperature divided by standard sea-level temperature.",
  "Dynamic Pressure": "Dynamic pressure for the current density and true airspeed.",
  "Impact Pressure": "Total pressure minus static pressure.",
  "Total Pressure": "Stagnation pressure for the documented subsonic model.",
  "DynPressure * S / g": "Dynamic-pressure force equivalent for the selected reference area.",
  "Lift Force": "Aerodynamic lift required by the selected condition.",
  "Weight/Delta W/δ": "Aircraft weight normalized by pressure ratio.",
  "Load Factor Nz": "Normal load factor for the selected maneuver.",
  "Bank Angle φ": "Bank angle for the coordinated level-turn relation.",
  "Turn Radius": "Signed coordinated level-turn radius.",
  "Turn Rate": "Signed coordinated level-turn angular rate.",
  "Track Angle": "Ground-track course angle.",
  "Heading Angle Ψ": "Aircraft nose heading angle.",
  "Drift Angle": "Heading minus track angle.",
  "Sideslip Angle β": "Angle between aircraft heading and relative wind.",
  "Wind Speed": "Horizontal wind-vector magnitude.",
  "Wind Direction": "Meteorological direction from which the wind blows.",
  "AlongTrack Headwind": "Wind component along the ground track.",
  "AlongTrack Crosswind": "Wind component perpendicular to the ground track.",
}

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
const INPUT_STATE_KEY = "aerocalculator.inputs.v1";
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
        <div class="brand">Aero Calculator</div>
        <button class="icon-button" id="add-profile" aria-label="Add airplane">+</button>
        <button class="icon-button" id="more-menu" aria-label="More options">⋮</button>
      </div>
      <nav class="tabs" aria-label="Aero Calculator sections">
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

    <div class="modal-overlay menu-overlay" id="main-menu">
      <div class="menu-sheet">
        <div class="modal-handle"></div>
        <div class="sheet-header">
          <strong>Menu</strong>
          <button type="button" class="sheet-close" id="main-menu-close" aria-label="Close menu">&times;</button>
        </div>
        <button type="button" class="sheet-item" data-menu="clear"><span>Clear Inputs</span><small>Reset all flight-condition entries</small></button>
        <button type="button" class="sheet-item" data-menu="import"><span>Import Airplanes</span><small>Restore or merge aircraft profiles</small></button>
        <button type="button" class="sheet-item" data-menu="export"><span>Export Airplanes</span><small>Back up all saved aircraft profiles</small></button>
        <button type="button" class="sheet-item" data-menu="settings"><span>Settings</span><small>Display, units, precision and aircraft data</small></button>
        <a class="sheet-item" id="feedback-link" href="mailto:flightdyn@gmail.com?subject=AeroCalculator%20Feedback"><span>Send Feedback</span><small>Send comments or report a problem</small></a>
        <button type="button" class="sheet-item" data-menu="about"><span>About</span><small>Version, author and credits</small></button>
      </div>
    </div>

    <input id="profile-import" type="file" accept=".json,application/json,text/plain" hidden />

    <dialog class="profile-dialog" id="profile-editor">
      <form method="dialog" id="profile-form">
        <div class="editor-toolbar">
          <button type="submit" value="save" id="profile-save">✓&nbsp;&nbsp;Save</button>
          <button type="button" id="profile-cancel">✕&nbsp;&nbsp;Cancel</button>
        </div>
        <div class="editor-scroll">
          <div class="editor-row editor-name-row"><label for="profile-name">Name</label><input id="profile-name" type="text" placeholder="Aircraft Name" /></div>
          <div class="editor-row"><label for="profile-sref">Area S<sub>ref</sub></label><input id="profile-sref" inputmode="decimal" placeholder="Reference Area" /><select id="profile-sref-unit" aria-label="Reference area unit"><option>m²</option><option>ft²</option><option>in²</option><option>cm²</option><option>mm²</option></select></div>
          <div class="editor-row"><label for="profile-cref">Chord c<sub>ref</sub></label><input id="profile-cref" inputmode="decimal" placeholder="Reference Chord" /><select id="profile-cref-unit" aria-label="Reference chord unit"><option>m</option><option>ft</option><option>in</option><option>cm</option><option>mm</option></select></div>
          <section class="editor-section">
            <div class="editor-section-head"><strong>Weight</strong><select id="profile-weight-unit" aria-label="Aircraft weight unit"><option>kg</option><option>lb</option><option>ton</option><option>slug</option><option>oz</option></select></div>
            <div class="weight-grid"><label>MTOW<input id="profile-weight-MTOW" inputmode="decimal" placeholder="MTOW" /></label><label>MLW<input id="profile-weight-MLW" inputmode="decimal" placeholder="MLW" /></label><label>MZFW<input id="profile-weight-MZFW" inputmode="decimal" placeholder="MZFW" /></label><label>BOW<input id="profile-weight-BOW" inputmode="decimal" placeholder="BOW" /></label><label>Heavy<input id="profile-weight-Heavy" inputmode="decimal" placeholder="Heavy" /></label><label>Light<input id="profile-weight-Light" inputmode="decimal" placeholder="Light" /></label></div>
          </section>
          <section class="editor-section">
            <div class="editor-section-head"><strong>C<sub>L,max</sub></strong><button type="button" id="add-flap" class="add-flap" aria-label="Add flap maximum lift coefficient">＋</button></div>
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
        <h2>Aero Calculator</h2>
        <p>Browser edition</p>
        <p>Gustavo José Zambrano</p>
        <button type="button" data-close-dialog="about-dialog">OK</button>
      </div>
    </dialog>
    <div class="modal-overlay settings-overlay" id="settings-dialog">
      <div class="settings-dialog settings-sheet">
        <div class="modal-handle"></div>
        <form id="settings-form">
          <div class="settings-header"><span>Settings</span><button type="button" class="settings-close" id="settings-close" aria-label="Close settings">&times;</button></div>
          <h3>DISPLAY</h3>
          <div class="setting-row">
            <div class="setting-text">
              <span class="setting-title">Theme</span>
              <span class="setting-desc">Visual style and color palette</span>
            </div>
            <select id="setting-theme" class="setting-native-select" aria-label="Theme">
              <option>Green Peace</option><option>Ancient Brown</option><option>Dark Shadows</option><option>Blue Sky</option><option>Red Alert</option><option>Orange Juice</option>
            </select>
            <button type="button" class="setting-choice" data-setting-select="setting-theme" data-setting-title="Theme"></button>
          </div>
          <div class="setting-row check-row">
            <div class="setting-text">
              <span class="setting-title">Extra Decimal Place</span>
              <span class="setting-desc">Increase result precision by one decimal</span>
            </div>
            <input id="setting-extra-decimal" type="checkbox" />
          </div>

          <h3>OUTPUT UNITS</h3>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Altitude Unit</span><span class="setting-desc">Unit used for altitude in calculated outputs</span></div>
            <select id="setting-altitude" class="setting-native-select" aria-label="Altitude Unit"><option>ft</option><option>m</option><option>km</option><option>nm</option><option>mi</option><option>in</option></select>
            <button type="button" class="setting-choice" data-setting-select="setting-altitude" data-setting-title="Altitude Unit"></button>
          </div>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Pressure Unit</span><span class="setting-desc">Unit used for atmospheric pressure in outputs</span></div>
            <select id="setting-pressure" class="setting-native-select" aria-label="Pressure Unit"><option>mbar</option><option>Pa</option><option>hPa</option><option>atm</option><option>mmHg</option><option>psi</option></select>
            <button type="button" class="setting-choice" data-setting-select="setting-pressure" data-setting-title="Pressure Unit"></button>
          </div>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Temperature Unit</span><span class="setting-desc">Unit used for temperature in outputs</span></div>
            <select id="setting-temperature" class="setting-native-select" aria-label="Temperature Unit"><option>°C</option><option>°F</option><option>K</option></select>
            <button type="button" class="setting-choice" data-setting-select="setting-temperature" data-setting-title="Temperature Unit"></button>
          </div>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Speed Unit</span><span class="setting-desc">Unit used for airspeed and velocity outputs</span></div>
            <select id="setting-speed" class="setting-native-select" aria-label="Speed Unit"><option>kt</option><option>m/s</option><option>km/h</option><option>mph</option><option>ft/s</option></select>
            <button type="button" class="setting-choice" data-setting-select="setting-speed" data-setting-title="Speed Unit"></button>
          </div>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Angle Unit</span><span class="setting-desc">Degrees or radians for angular outputs</span></div>
            <select id="setting-angle" class="setting-native-select" aria-label="Angle Unit"><option>deg</option><option>rad</option></select>
            <button type="button" class="setting-choice" data-setting-select="setting-angle" data-setting-title="Angle Unit"></button>
          </div>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Angle Interval</span><span class="setting-desc">Positive or signed angular convention</span></div>
            <select id="setting-angle-format" class="setting-native-select" aria-label="Angle Interval"><option value="0/360">0/360 (0/2π)</option><option value="-180/180">-180/180 (-π/π)</option></select>
            <button type="button" class="setting-choice" data-setting-select="setting-angle-format" data-setting-title="Angle Interval"></button>
          </div>

          <h3>AIRCRAFT DATA</h3>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Export Airplanes</span><span class="setting-desc">Back up all saved aircraft profiles</span></div>
            <button type="button" class="setting-btn" id="setting-export-btn">Export</button>
          </div>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Clear Inputs</span><span class="setting-desc">Reset all flight-condition entries</span></div>
            <button type="button" class="setting-btn" id="setting-clear-btn">Clear</button>
          </div>
          <div class="dialog-buttons">
            <button type="button" id="settings-cancel">Cancel</button>
            <button type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
    <div id="field-tooltip" class="field-tooltip" role="tooltip" hidden></div>

    <!-- MODAL: CONTEXTUAL HELP & TOOLTIP WITH LATEX (RotorCalculator standard) -->
    <div class="modal-overlay" id="modal-result-tooltip">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title" id="result-tooltip-title">About • Parameter</div>
          <button type="button" class="modal-close-btn" id="modal-tooltip-close" data-close="modal-result-tooltip" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          <div id="result-tooltip-desc" style="font-size: 14.5px; line-height: 1.6; color: var(--button-text); margin-bottom: 14px;"></div>
          <div id="result-tooltip-eq-box" style="display: none;"></div>
          <div id="result-tooltip-range-box" style="display: none; font-size: 13.5px; margin-bottom: 10px;">
            <span style="font-weight: 700; color: #00a876;">Model / Assumptions: </span>
            <span id="result-tooltip-range-text" style="color: var(--button-text);"></span>
          </div>
          <div id="result-tooltip-unit-box" style="display: none; font-size: 13.5px; margin-bottom: 16px;">
            <span style="font-weight: 700; color: #d97706;">SI / Reference Unit: </span>
            <span id="result-tooltip-unit-text" style="color: var(--button-text); font-weight: 700;"></span>
          </div>
          <button type="button" class="action-btn" id="btn-result-tooltip-ok" style="width: 100%; height: 42px; font-weight: 700; color: var(--accent); background: var(--button-a); border: 1px solid var(--button-border); border-radius: 8px; cursor: pointer;">OK</button>
        </div>
      </div>
    </div>

    <!-- MODAL: FIELD OPTION SELECTOR (Bottom Sheet Picker) -->
    <div class="modal-overlay" id="modal-options-selector">
      <div class="modal-card options-modal-card">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title" id="options-selector-title">Select Option</div>
          <button type="button" class="modal-close-btn" id="modal-options-close" data-close="modal-options-selector" aria-label="Close">&times;</button>
        </div>
        <div class="options-modal-body">
          <div class="options-list" id="options-selector-list"></div>
        </div>
        <div class="options-modal-footer">
          <button type="button" id="options-selector-cancel">Cancel</button>
        </div>
      </div>
    </div>
  </main>
`;

export function showContextualHelp(key: string): void {
  const item = CATALOG[key] || {
    title: key,
    desc: RESULT_HELPERS[key] || `Technical documentation for ${key}.`,
    eq: "",
    model: "Within the documented atmosphere and subsonic flight model.",
    unit: "",
  };

  const titleEl = byId("result-tooltip-title");
  if (titleEl) {
    if (CATALOG[key]) titleEl.innerHTML = item.title;
    else titleEl.textContent = item.title;
  }

  const descEl = byId("result-tooltip-desc");
  if (descEl) descEl.textContent = item.desc;

  const eqBox = byId("result-tooltip-eq-box");
  const renderedEq = renderEquationLaTeX(key, item.eq);
  if (renderedEq && eqBox) {
    eqBox.innerHTML = renderedEq;
    eqBox.style.display = "block";
  } else if (eqBox) {
    eqBox.innerHTML = "";
    eqBox.style.display = "none";
  }

  const rangeBox = byId("result-tooltip-range-box");
  const rangeText = byId("result-tooltip-range-text");
  if (item.model && rangeBox && rangeText) {
    rangeText.textContent = item.model;
    rangeBox.style.display = "block";
  } else if (rangeBox) {
    rangeBox.style.display = "none";
  }

  const unitBox = byId("result-tooltip-unit-box");
  const unitText = byId("result-tooltip-unit-text");
  if (item.unit && unitBox && unitText) {
    unitText.textContent = item.unit === "-" ? "Dimensionless (—)" : item.unit;
    unitBox.style.display = "block";
  } else if (unitBox) {
    unitBox.style.display = "none";
  }

  byId("modal-result-tooltip")?.classList.add("open");
}

(window as unknown as { showContextualHelp: typeof showContextualHelp }).showContextualHelp = showContextualHelp;

const closeTooltipModal = () => {
  byId("modal-result-tooltip")?.classList.remove("open");
};
byId("modal-tooltip-close")?.addEventListener("click", closeTooltipModal);
byId("btn-result-tooltip-ok")?.addEventListener("click", closeTooltipModal);
byId("modal-result-tooltip")?.addEventListener("click", (e) => {
  if (e.target === byId("modal-result-tooltip")) closeTooltipModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && byId("modal-result-tooltip")?.classList.contains("open")) {
    closeTooltipModal();
  }
});

const FIELD_MODAL_TITLES: Record<string, string> = {
  spd: "Speed Type",
  weight: "Aircraft Mass",
  clmax: "Maximum Lift Coefficient",
  alt: "Altitude Type",
  temp: "Temperature Type",
  nz: "Maneuver Type",
  angle1: "Heading / Track",
  angle2: "Lateral Angle Type",
  headWind: "Wind Input Type",
  windRef: "Reference Angle",
  sref: "Wing Reference Area",
  cref: "Wing Reference Chord",
  crossWind: "Wind Input Type",
};

const FIELD_OPTION_DESCRIPTIONS: Record<string, string> = {
  // Speed
  TAS: "True airspeed",
  CAS: "Calibrated airspeed",
  EAS: "Equivalent airspeed",
  Mach: "TAS / speed of sound",
  CL: "Lift coefficient",
  "Vs Factor": "Multiple of stall speed",
  "Ground Speed": "Speed over ground",
  Qdyn: "Dynamic pressure q = ½ ρ V²",
  Qc: "Total pressure minus static pressure",

  // Weight
  Weight: "Manual mass entry",
  MTOW: "Maximum takeoff weight",
  MLW: "Maximum landing weight",
  MZFW: "Maximum zero fuel weight",
  BOW: "Basic operational weight",
  Heavy: "Heavy configuration weight",
  Light: "Light configuration weight",

  // Flaps / CLmax
  CLmax: "User-defined max lift coefficient",
  "Flap 0": "Flap 0 (clean configuration) maximum lift coefficient",

  // Altitude
  Hp: "Barometric altitude, ISA",
  Hg: "True height above MSL",
  P: "Direct static pressure input",

  // Temperature
  "Δ ISA": "Temperature deviation from ISA",
  OAT: "Outside air temperature",

  // Maneuver
  NzPullup: "Symmetric pull-up (n = L/W)",
  NzTurn: "Coordinated turn load factor",
  BankTurn: "Coordinated turn bank angle",

  // Angles
  Track: "Course over ground (True North)",
  Heading: "Aircraft nose heading (True North)",
  Sideslip: "Angle between heading and wind",
  Drift: "Heading minus track angle",

  // Wind
  HeadWind: "Runway wind components directly",
  "Wind Speed": "Total wind speed magnitude",
  "Runway Angle": "Runway heading (True North)",
  "Wind Direction": "Direction wind blows from (True North)",

  // Geometry
  Sref: "Theoretical wing planform area",
  cref: "Mean aerodynamic chord",
  CrossWind: "Runway crosswind component directly",
};

const closeOptionsModal = () => {
  byId("modal-options-selector")?.classList.remove("open");
};
byId("modal-options-close")?.addEventListener("click", closeOptionsModal);
byId("options-selector-cancel")?.addEventListener("click", closeOptionsModal);
byId("modal-options-selector")?.addEventListener("click", (e) => {
  if (e.target === byId("modal-options-selector")) closeOptionsModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && byId("modal-options-selector")?.classList.contains("open")) {
    closeOptionsModal();
  }
});

function openFieldOptionPicker(fieldId: string): void {
  const typeSelect = document.getElementById(`${fieldId}-type`) as HTMLSelectElement | null;
  if (!typeSelect || typeSelect.disabled) return;

  const modal = byId("modal-options-selector");
  const titleEl = byId("options-selector-title");
  const listEl = byId("options-selector-list");
  if (!modal || !titleEl || !listEl) return;

  const title = FIELD_MODAL_TITLES[fieldId] ?? "Select Option";
  titleEl.textContent = title;

  listEl.innerHTML = "";
  const currentValue = typeSelect.value;

  Array.from(typeSelect.options).forEach((opt) => {
    const val = opt.value;
    let label = opt.label || val;
    if (fieldId === "weight" && val === "Weight") label = "Custom Mass";
    else if (fieldId === "clmax" && val === "CLmax") label = "Custom C<sub>L,max</sub>";
    else if (fieldId === "clmax" && val === "Flap 0") label = "Flap 0 (clean)";
    else if (fieldId === "spd" && val === "Qc") label = "Impact Pressure q<sub>c</sub>";
    else if (fieldId === "spd" && val === "Qdyn") label = "Dynamic Pressure q";
    else if (DEFAULT_OPTION_LABELS[val]) label = DEFAULT_OPTION_LABELS[val];

    let desc = FIELD_OPTION_DESCRIPTIONS[val];
    if (!desc && val.startsWith("Flap ")) {
      const flapNum = val.slice(5);
      desc = `Flap ${flapNum} maximum lift coefficient`;
    }

    const itemEl = document.createElement("div");
    itemEl.className = `option-item${val === currentValue ? " selected" : ""}`;
    itemEl.tabIndex = 0;
    itemEl.setAttribute("role", "button");

    const textGroup = document.createElement("div");
    textGroup.className = "option-text-group";

    const labelEl = document.createElement("div");
    labelEl.className = "option-label";
    labelEl.innerHTML = label;
    textGroup.appendChild(labelEl);

    if (desc) {
      const descEl = document.createElement("div");
      descEl.className = "option-desc";
      descEl.textContent = desc;
      textGroup.appendChild(descEl);
    }

    const radio = document.createElement("div");
    radio.className = "option-radio";
    const radioInner = document.createElement("div");
    radioInner.className = "option-radio-inner";
    radio.appendChild(radioInner);

    itemEl.append(textGroup, radio);

    const selectThis = () => {
      vibrateTap();
      if (typeSelect.value !== val) {
        typeSelect.value = val;
        typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      closeOptionsModal();
    };

    itemEl.addEventListener("click", selectThis);
    itemEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectThis();
      }
    });

    listEl.appendChild(itemEl);
  });

  modal.classList.add("open");
}

const SETTING_OPTION_DESCRIPTIONS: Record<string, Record<string, string>> = {
  "setting-theme": {
    "Green Peace": "Teal daylight interface",
    "Ancient Brown": "Warm leather and sepia surfaces",
    "Dark Shadows": "Cockpit stealth, high contrast",
    "Blue Sky": "Midnight navy with cyan accents",
    "Red Alert": "Crimson avionics on neutral surfaces",
    "Orange Juice": "Warm cockpit amber",
  },
  "setting-altitude": { ft: "Feet", m: "Meters — SI unit", km: "Kilometers", nm: "Nautical miles", mi: "Statute miles", in: "Inches" },
  "setting-pressure": { mbar: "Millibar (hPa)", Pa: "Pascal — SI unit", hPa: "Hectopascal", atm: "Standard atmosphere", mmHg: "Millimeters of mercury", psi: "Pounds per square inch" },
  "setting-temperature": { "°C": "Degrees Celsius", "°F": "Degrees Fahrenheit", K: "Kelvin — absolute" },
  "setting-speed": { kt: "Knots — aviation standard", "m/s": "Meters per second — SI unit", "km/h": "Kilometers per hour", mph: "Miles per hour", "ft/s": "Feet per second" },
  "setting-angle": { deg: "Degrees", rad: "Radians" },
  "setting-angle-format": { "0/360": "Positive convention", "-180/180": "Signed convention" },
};

function syncSettingChoiceButtons(): void {
  document.querySelectorAll<HTMLButtonElement>(".setting-choice").forEach((button) => {
    const selectId = button.dataset.settingSelect ?? "";
    const selectEl = document.getElementById(selectId) as HTMLSelectElement | null;
    if (!selectEl) return;
    button.textContent = selectEl.options[selectEl.selectedIndex]?.text ?? selectEl.value;
  });
}

function openSettingOptionPicker(selectId: string, title: string): void {
  const selectEl = document.getElementById(selectId) as HTMLSelectElement | null;
  const modal = byId("modal-options-selector");
  const titleEl = byId("options-selector-title");
  const listEl = byId("options-selector-list");
  if (!selectEl || !modal || !titleEl || !listEl) return;

  titleEl.textContent = title;
  listEl.innerHTML = "";
  const descriptions = SETTING_OPTION_DESCRIPTIONS[selectId] ?? {};

  Array.from(selectEl.options).forEach((opt) => {
    const itemEl = document.createElement("div");
    itemEl.className = `option-item${opt.value === selectEl.value ? " selected" : ""}`;
    itemEl.tabIndex = 0;
    itemEl.setAttribute("role", "button");

    const textGroup = document.createElement("div");
    textGroup.className = "option-text-group";
    const label = document.createElement("div");
    label.className = "option-label";
    label.textContent = opt.text;
    textGroup.appendChild(label);

    const desc = descriptions[opt.value] ?? descriptions[opt.text];
    if (desc) {
      const descEl = document.createElement("div");
      descEl.className = "option-desc";
      descEl.textContent = desc;
      textGroup.appendChild(descEl);
    }

    const radio = document.createElement("div");
    radio.className = "option-radio";
    const radioInner = document.createElement("div");
    radioInner.className = "option-radio-inner";
    radio.appendChild(radioInner);
    itemEl.append(textGroup, radio);

    const choose = () => {
      vibrateTap();
      selectEl.value = opt.value;
      syncSettingChoiceButtons();
      closeOptionsModal();
    };
    itemEl.addEventListener("click", choose);
    itemEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose();
      }
    });
    listEl.appendChild(itemEl);
  });

  modal.classList.add("open");
}

const inputList = byId("input-list");
inputList.append(createAirplaneRow());
for (const field of fields) inputList.append(createInputRow(field));

const resultsList = byId("results");
for (const name of resultNames) {
  const li = document.createElement("li");
  li.className = "result-row";
  li.tabIndex = 0;
  li.dataset.helper = RESULT_HELPERS[name] ?? name;
  li.dataset.name = name;
  li.innerHTML = `<span class="result-name">${RESULT_DISPLAY_LABELS[name] ?? name}</span><span class="result-value na" data-result="${name}">----</span>`;
  li.addEventListener("click", () => showContextualHelp(name));
  resultsList.append(li);
}

document.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    vibrateTap();
    activatePage(tab.dataset.page ?? "inputs");
  });
});

document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".calc-control").forEach((el) => {
  el.addEventListener("input", () => {
    if (el.id === "weight-value" && selectValue("weight-type") !== "Weight") {
      select("weight-type").value = "Weight";
      updateTypeSelectDisplay(select("weight-type"));
    }
    if (el.id === "clmax-value" && selectValue("clmax-type") !== "CLmax") {
      select("clmax-type").value = "CLmax";
      updateTypeSelectDisplay(select("clmax-type"));
    }
    persistInputState();
    recalculate();
  });
  el.addEventListener("change", () => {
    if (el instanceof HTMLSelectElement && el.id.endsWith("-type")) {
      vibrateTap();
      updateTypeSelectDisplay(el);
      handleTypeSelectionChange(el);
    } else if (el instanceof HTMLSelectElement && el.id.endsWith("-unit")) {
      vibrateTap();
      convertInputForUnitChange(el);
    }
    normalizeDependentUnits();
    if (el instanceof HTMLSelectElement && el.id.endsWith("-type")) updateInputHelpers(el.id.replace(/-type$/, ""));
    if (el.id === "weight-type" || el.id === "clmax-type") applyProfileNamedValue();
    syncSelectPreviousValues();
    persistInputState();
    recalculate();
  });
});

byId("add-profile").addEventListener("click", () => openProfileEditor());
byId("more-menu").addEventListener("click", () => {
  vibrateTap();
  byId("main-menu").classList.add("open");
});
byId("main-menu-close")?.addEventListener("click", () => byId("main-menu").classList.remove("open"));
byId("main-menu").addEventListener("click", (event) => {
  if (event.target === byId("main-menu")) byId("main-menu").classList.remove("open");
});
document.querySelectorAll<HTMLButtonElement>("[data-menu]").forEach((button) => {
  button.addEventListener("click", () => handleMenu(button.dataset.menu ?? ""));
});
byId("feedback-link").addEventListener("click", () => {
  byId("main-menu").classList.remove("open");
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
byId("settings-cancel").addEventListener("click", () => byId("settings-dialog").classList.remove("open"));
byId("settings-close")?.addEventListener("click", () => byId("settings-dialog").classList.remove("open"));
byId("settings-dialog").addEventListener("click", (event) => {
  if (event.target === byId("settings-dialog")) byId("settings-dialog").classList.remove("open");
});
document.querySelectorAll<HTMLButtonElement>(".setting-choice").forEach((button) => {
  button.addEventListener("click", () => openSettingOptionPicker(
    button.dataset.settingSelect ?? "",
    button.dataset.settingTitle ?? "Select Option",
  ));
});
byId("setting-export-btn")?.addEventListener("click", () => exportProfileFile());
byId("setting-clear-btn")?.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the inputs?")) clearInputs();
});
byId("settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  saveOutputSettings();
});

initializeHelpers();
initializeSwipeNavigation();
window.matchMedia("(max-width: 430px)").addEventListener("change", refreshResponsiveOptionLabels);

applyTheme();
renderProfiles();
renderAirplaneSelector();
applyProfileSelection(selectedProfileId, false);
restoreInputState();
normalizeDependentUnits();
for (const field of fields) updateInputHelpers(field.id);
syncSelectPreviousValues();
recalculate();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI).toString())
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        document.documentElement.dataset.offlineReady = "true";
      })
      .catch(() => undefined);
  });
}

function createAirplaneRow(): HTMLElement {
  const row = document.createElement("div");
  row.className = "input-row airplane-row";

  const label = document.createElement("button");
  label.type = "button";
  label.className = "field-button";
  label.textContent = "Airplane";
  setHelper(label, "Open the aircraft-profile list to create, edit or select stored aircraft geometry.");
  label.addEventListener("click", () => {
    vibrateTap();
    activatePage("airplanes");
  });
  label.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showContextualHelp("Aircraft Profile");
  });

  const picker = document.createElement("select");
  picker.id = "airplane-select";
  picker.className = "profile-select";
  picker.setAttribute("aria-label", "Airplane profile");
  setHelper(picker, "Select a stored aircraft profile. Its reference geometry, named weights and flap maximum-lift-coefficient values become available in Inputs.");
  picker.addEventListener("click", () => vibrateTap());
  picker.addEventListener("change", () => {
    vibrateTap();
    applyProfileSelection(picker.value);
  });

  row.append(label, picker);
  return row;
}

function updateTypeSelectDisplay(selectEl: HTMLSelectElement): void {
  const wrap = selectEl.closest(".field-select-wrap");
  const display = wrap?.querySelector<HTMLElement>(".field-select-display");
  if (!display) return;
  const option = selectEl.selectedOptions[0];
  if (!option) {
    display.innerHTML = "";
    return;
  }
  const rawLabel = DEFAULT_OPTION_LABELS[option.value] ?? option.label ?? option.value;
  display.classList.toggle("pressure-altitude-label", option.value === "Hp");
  display.innerHTML = responsiveOptionLabel(option.value, rawLabel);
}

function createInputRow(field: Field): HTMLElement {
  const row = document.createElement("div");
  row.className = "input-row";
  row.dataset.field = field.id;
  if (field.id === "spd") row.classList.add("speed-row");

  const wrap = document.createElement("div");
  wrap.className = "field-select-wrap";

  const display = document.createElement("div");
  display.className = "field-select-display";
  display.setAttribute("aria-hidden", "true");

  const type = document.createElement("select");
  type.id = `${field.id}-type`;
  type.className = "field-select calc-control select-invisible";
  type.setAttribute("aria-label", `${field.id} quantity`);
  fillSelect(type, field.typeOptions, field.defaultType);
  const initialHelper = helperFor(field.id, field.defaultType);
  setHelper(type, initialHelper);
  setHelper(wrap, initialHelper);

  wrap.append(type, display);
  updateTypeSelectDisplay(type);
  wrap.tabIndex = 0;
  wrap.setAttribute("role", "button");
  wrap.setAttribute("aria-haspopup", "dialog");
  wrap.setAttribute("aria-label", `${field.id} quantity options`);
  wrap.addEventListener("click", () => {
    if (held) return;
    vibrateTap();
    openFieldOptionPicker(field.id);
  });
  wrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      vibrateTap();
      openFieldOptionPicker(field.id);
    }
  });
  type.addEventListener("change", () => {
    vibrateTap();
    updateTypeSelectDisplay(type);
  });

  let timer: number | undefined;
  let held = false;
  wrap.addEventListener("pointerdown", () => {
    held = false;
    timer = window.setTimeout(() => {
      held = true;
      showContextualHelp(type.value);
    }, 550);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((evt) =>
    wrap.addEventListener(evt, () => window.clearTimeout(timer))
  );
  wrap.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showContextualHelp(type.value);
  });

  const value = document.createElement("input");
  value.id = `${field.id}-value`;
  value.className = "value-input calc-control";
  value.inputMode = "decimal";
  value.autocomplete = "off";
  value.placeholder = field.placeholder ?? "";
  value.value = field.defaultValue ?? "";
  value.setAttribute("aria-label", `${field.typeOptions.find((item) => item.value === field.defaultType)?.label ?? field.id} value`);
  setHelper(value, helperFor(field.id, field.defaultType));

  const unit = document.createElement("select");
  unit.id = `${field.id}-unit`;
  unit.className = "unit-select calc-control";
  unit.setAttribute("aria-label", `${field.id} unit`);
  fillSelect(unit, field.unitOptions, field.defaultUnit);
  setHelper(unit, "Unit used for this input value. Changing the unit converts the current numeric value when applicable.");
  unit.addEventListener("click", () => vibrateTap());
  unit.addEventListener("change", () => vibrateTap());

  if (field.unitOptions.length === 1 && field.unitOptions[0].value === "-") {
    unit.disabled = true;
    unit.style.cursor = "default";
    unit.style.opacity = "0.7";
  }

  const tail = document.createElement("div");
  tail.className = "input-tail";
  tail.append(unit);

  if (field.id === "spd") {
    const deltaLabel = document.createElement("button");
    deltaLabel.type = "button";
    deltaLabel.id = "spdDelta-label";
    deltaLabel.className = "speed-delta-label";
    deltaLabel.textContent = "+ Δ";
    deltaLabel.setAttribute("aria-label", "Delta speed relative to stall-speed factor");
    setHelper(deltaLabel, "Additional calibrated speed added after applying the stall-speed factor. This Δ term is always entered in knots.");
    deltaLabel.hidden = true;

    const delta = document.createElement("input");
    delta.id = "spdDelta-value";
    delta.className = "value-input calc-control speed-delta";
    delta.inputMode = "decimal";
    delta.autocomplete = "off";
    delta.placeholder = "+ Δkt";
    delta.value = "0";
    delta.hidden = true;
    delta.setAttribute("aria-label", "Stall-speed-factor delta in knots");
    setHelper(delta, "Additional calibrated speed in knots added after multiplying the 1-g stall speed by the selected factor.");
    deltaLabel.addEventListener("click", () => {
      vibrateTap();
      delta.focus();
    });

    tail.append(delta);
    row.append(wrap, value, deltaLabel, tail);
    return row;
  }

  row.append(wrap, value, tail);
  return row;
}

function setHelper(element: HTMLElement, text: string): void {
  element.dataset.helper = text;
}

function updateInputHelpers(fieldId: string): void {
  const type = document.getElementById(`${fieldId}-type`) as HTMLSelectElement | null;
  const value = document.getElementById(`${fieldId}-value`) as HTMLInputElement | null;
  if (!type || !value) return;
  updateTypeSelectDisplay(type);
  const helper = helperFor(fieldId, type.value);
  setHelper(type, helper);
  setHelper(value, helper);
  const wrap = type.closest<HTMLElement>(".field-select-wrap");
  if (wrap) setHelper(wrap, helper);
  const selectedLabel = type.selectedOptions[0]?.textContent?.trim() || fieldId;
  value.setAttribute("aria-label", `${selectedLabel} value`);
}

function initializeHelpers(): void {
  const tooltip = byId("field-tooltip");
  let activeTarget: HTMLElement | null = null;

  const show = (target: HTMLElement): void => {
    const text = target.dataset.helper?.trim();
    if (!text) return;
    activeTarget = target;
    tooltip.textContent = text;
    tooltip.hidden = false;
    tooltip.style.left = "8px";
    tooltip.style.top = "8px";

    requestAnimationFrame(() => {
      if (activeTarget !== target || tooltip.hidden) return;
      const rect = target.getBoundingClientRect();
      const tip = tooltip.getBoundingClientRect();
      const margin = 8;
      const left = Math.min(
        Math.max(margin, rect.left + rect.width / 2 - tip.width / 2),
        Math.max(margin, window.innerWidth - tip.width - margin),
      );
      const below = rect.bottom + 8;
      const top = below + tip.height <= window.innerHeight - margin
        ? below
        : Math.max(margin, rect.top - tip.height - 8);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });
  };

  const hide = (target?: HTMLElement): void => {
    if (target && activeTarget !== target) return;
    activeTarget = null;
    tooltip.hidden = true;
  };

  document.addEventListener("pointerover", (event) => {
    if ((event as PointerEvent).pointerType === "touch") return;
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-helper]");
    if (target) show(target);
  });
  document.addEventListener("pointerout", (event) => {
    if ((event as PointerEvent).pointerType === "touch") return;
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-helper]");
    if (target) hide(target);
  });
  document.addEventListener("focusin", (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-helper]");
    if (target) show(target);
  });
  document.addEventListener("focusout", (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-helper]");
    if (target) hide(target);
  });
  document.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-helper]");
    if (target && (target.classList.contains("result-row") || target.classList.contains("field-button") || target.classList.contains("field-select-wrap"))) {
      if (activeTarget === target && !tooltip.hidden) {
        hide(target);
      } else {
        show(target);
      }
    }
  });
  window.addEventListener("scroll", () => hide(), { passive: true });
  window.addEventListener("resize", () => hide(), { passive: true });
}

function currentPageName(): typeof PAGE_ORDER[number] {
  const selected = document.querySelector<HTMLButtonElement>('.tab[aria-selected="true"]')?.dataset.page;
  return PAGE_ORDER.includes(selected as typeof PAGE_ORDER[number])
    ? selected as typeof PAGE_ORDER[number]
    : "inputs";
}

function initializeSwipeNavigation(): void {
  const shell = document.querySelector<HTMLElement>(".app-shell");
  if (!shell) return;

  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let tracking = false;

  shell.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || document.querySelector("dialog[open]")) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = performance.now();
    tracking = true;
  });

  shell.addEventListener("pointermove", (event) => {
    if (!tracking || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.2) event.preventDefault();
  }, { passive: false });

  const finish = (event: PointerEvent): void => {
    if (!tracking || event.pointerId !== pointerId) return;
    tracking = false;
    pointerId = null;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const elapsed = performance.now() - startTime;
    if (elapsed > 900 || Math.abs(dx) < 55 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;

    const current = currentPageName();
    const index = PAGE_ORDER.indexOf(current);
    const nextIndex = dx < 0 ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= PAGE_ORDER.length) return;

    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    byId("main-menu").hidden = true;
    vibrateTap();
    activatePage(PAGE_ORDER[nextIndex], dx < 0 ? "left" : "right");
  };

  shell.addEventListener("pointerup", finish);
  shell.addEventListener("pointercancel", () => {
    tracking = false;
    pointerId = null;
  });
}

function responsiveOptionLabel(value: string, label: string): string {
  if (!window.matchMedia("(max-width: 430px)").matches) return label;
  if (value === "Hp") return "H<sub class='hp-sub'>p</sub>";
  if (value === "Hg") return "H<sub>geom</sub>";
  if (value === "P") return "p";
  if (value === "OAT") return "OAT";
  if (value === "TAS") return "TAS";
  if (value === "CAS") return "CAS";
  if (value === "EAS") return "EAS";
  if (value === "Vs Factor") return "V<sub>s</sub> Fact";
  if (value === "Ground Speed") return window.matchMedia("(max-width: 330px)").matches ? "Grnd Speed" : "Ground Speed";
  if (value === "Qdyn") return "q";
  if (value === "Qc") return "q<sub>c</sub>";
  if (value === "Sref") return "S<sub>ref</sub>";
  if (value === "cref") return "c<sub>ref</sub>";
  if (value === "CLmax") return "C<sub>L,max</sub>";
  if (value === "NzTurn") return "N<sub>z</sub>";
  if (value === "BankTurn") return "Bank";
  if (value === "Track") return "Track";
  if (value === "Heading") return "Heading";
  if (value === "Sideslip") return "Sideslip";
  if (value === "Drift") return "Drift";
  if (value === "HeadWind") return "HeadWnd";
  if (value === "Wind Speed") return "WindSpd";
  if (value === "CrossWind") return "CrossWnd";
  if (value === "Runway Angle") return window.matchMedia("(max-width: 330px)").matches ? "Rnwy Angle" : "Runway Angle";
  if (value === "Wind Direction") return "WindDir";
  return label;
}

function refreshResponsiveOptionLabels(): void {
  document.querySelectorAll<HTMLSelectElement>("select").forEach((selectElement) => {
    for (const option of selectElement.options) {
      const defaultLabel = DEFAULT_OPTION_LABELS[option.value] ?? option.value;
      option.innerHTML = responsiveOptionLabel(option.value, defaultLabel);
    }
    if (selectElement.id.endsWith("-type")) updateTypeSelectDisplay(selectElement);
  });
}

function fillSelect(select: HTMLSelectElement, options: SelectOption[], selected: string): void {
  select.replaceChildren(...options.map((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.innerHTML = responsiveOptionLabel(item.value, item.label);
    option.selected = item.value === selected;
    return option;
  }));
}

function activatePage(page: string, swipeDirection?: "left" | "right"): void {
  vibrateTap();
  document.querySelectorAll<HTMLElement>(".page").forEach((el) => {
    el.classList.toggle("active", el.id === `page-${page}`);
    el.classList.remove("swipe-in-left", "swipe-in-right");
  });
  const activePage = document.getElementById(`page-${page}`);
  if (activePage && swipeDirection) {
    activePage.classList.add(swipeDirection === "left" ? "swipe-in-left" : "swipe-in-right");
    window.setTimeout(() => activePage.classList.remove("swipe-in-left", "swipe-in-right"), 180);
  }
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((el) => el.setAttribute("aria-selected", String(el.dataset.page === page)));
  if (page === "calculate") recalculate();
}

function renderProfiles(): void {
  const list = byId("profile-list");
  list.replaceChildren();
  for (const profile of profiles) {
    const displayName = profile.name || "Unnamed Airplane";
    const row = document.createElement("div");
    row.className = "airplane-list-row";
    row.dataset.profileId = profile.id;
    const isActive = selectedProfileId === profile.id;
    if (isActive) {
      row.classList.add("active-profile");
    }

    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "airplane-drag-handle";
    dragHandle.textContent = "☰";
    dragHandle.setAttribute("aria-label", `Drag to reorder ${displayName}`);
    dragHandle.title = "Drag to reorder";
    setHelper(dragHandle, "Drag this airplane up or down to reorder the list. The saved and exported airplanes.txt order follows this list.");
    row.draggable = true;
    row.addEventListener("dragstart", (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".airplane-duplicate-button, .airplane-edit-button, .airplane-delete-button")) {
        event.preventDefault();
        return;
      }
      beginDesktopProfileDrag(event, row, dragHandle);
    });
    row.addEventListener("dragend", () => finishDesktopProfileDrag(row));
    dragHandle.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") beginProfileDrag(event, row, dragHandle);
    });

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "airplane-name-button";
    const activeBadge = isActive ? `<span class="active-badge">ACTIVE</span>` : "";
    const primaryWeight = profile.weights?.MTOW ?? Object.values(profile.weights ?? {})[0];
    const weightText = primaryWeight != null ? ` · ${primaryWeight} ${profile.weightUnit}` : (profile.cref ? ` · ${profile.cref} ${profile.crefUnit}` : "");
    selectButton.innerHTML = `<span class="airplane-name-line"><strong>${escapeHtml(displayName)}</strong>${activeBadge}</span><span class="airplane-meta">${profile.sref} ${profile.srefUnit}${weightText}</span>`;
    selectButton.title = "Select airplane";
    const activateProfile = () => {
      vibrateTap();
      applyProfileSelection(profile.id);
      activatePage("inputs");
    };
    selectButton.addEventListener("click", activateProfile);

    const duplicateButton = document.createElement("button");
    duplicateButton.type = "button";
    duplicateButton.className = "airplane-duplicate-button";
    duplicateButton.textContent = "⧉";
    duplicateButton.setAttribute("aria-label", `Duplicate ${displayName}`);
    duplicateButton.title = "Duplicate airplane";
    setHelper(duplicateButton, "Duplicate this aircraft immediately below the original, including geometry, weights and maximum lift coefficient values.");
    duplicateButton.addEventListener("click", () => duplicateStoredProfile(profile.id));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "airplane-edit-button";
    editButton.textContent = "✎";
    editButton.setAttribute("aria-label", `Edit ${displayName}`);
    editButton.title = "Edit airplane";
    setHelper(editButton, "Edit this aircraft profile.");
    editButton.addEventListener("click", () => openProfileEditor(profile.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "airplane-delete-button";
    deleteButton.textContent = "🗑";
    deleteButton.setAttribute("aria-label", `Delete ${displayName}`);
    deleteButton.title = "Delete airplane";
    setHelper(deleteButton, "Delete this aircraft profile.");
    deleteButton.addEventListener("click", () => {
      if (!confirm(`Delete ${profile.name || "this aircraft"}?`)) return;
      profiles = deleteProfile(profiles, profile.id);
      saveProfiles(localStorage, profiles);
      renderProfiles();
      renderAirplaneSelector();
      applyProfileSelection(selectedProfileId, false);
    });

    row.append(dragHandle, selectButton, duplicateButton, editButton, deleteButton);
    list.append(row);
  }
}

function duplicateStoredProfile(id: string): void {
  const sourceIndex = profiles.findIndex((profile) => profile.id === id);
  if (sourceIndex < 0) return;

  const next = duplicateProfile(profiles, id);
  const duplicate = next[sourceIndex + 1];
  if (!duplicate || duplicate.id === id) return;

  profiles = next;
  saveProfiles(localStorage, profiles);
  selectedProfileId = duplicate.id;
  localStorage.setItem(SELECTED_PROFILE_KEY, selectedProfileId);
  renderProfiles();
  renderAirplaneSelector();
  applyProfileSelection(duplicate.id, false);
}

function moveProfileRowAtY(list: HTMLElement, row: HTMLElement, clientY: number): void {
  const siblings = Array.from(list.querySelectorAll<HTMLElement>(".airplane-list-row"))
    .filter((candidate) => candidate !== row);
  const before = siblings.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });

  if (before) list.insertBefore(row, before);
  else list.append(row);
}

function persistProfileOrderFromDom(list: HTMLElement, movedProfileId: string): void {
  const orderedIds = Array.from(list.querySelectorAll<HTMLElement>(".airplane-list-row"))
    .map((item) => item.dataset.profileId)
    .filter((id): id is string => Boolean(id));
  const finalIndex = orderedIds.indexOf(movedProfileId);
  if (finalIndex < 0) {
    renderProfiles();
    return;
  }

  profiles = reorderProfile(profiles, movedProfileId, finalIndex);
  saveProfiles(localStorage, profiles);
  renderProfiles();
  renderAirplaneSelector();
}

function beginDesktopProfileDrag(event: DragEvent, row: HTMLElement, handle: HTMLButtonElement): void {
  const profileId = row.dataset.profileId;
  if (!profileId || !event.dataTransfer) return;

  event.stopPropagation();
  row.classList.add("dragging");
  handle.classList.add("dragging-handle");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", profileId);

  const list = byId("profile-list");
  const onDragOver = (dragEvent: DragEvent): void => {
    dragEvent.preventDefault();
    if (dragEvent.dataTransfer) dragEvent.dataTransfer.dropEffect = "move";
    moveProfileRowAtY(list, row, dragEvent.clientY);
  };
  const onDrop = (dropEvent: DragEvent): void => {
    dropEvent.preventDefault();
    finishDesktopProfileDrag(row);
  };

  list.dataset.draggingProfileId = profileId;
  list.addEventListener("dragover", onDragOver);
  list.addEventListener("drop", onDrop);
  (row as HTMLElement & { _desktopDragCleanup?: () => void })._desktopDragCleanup = () => {
    list.removeEventListener("dragover", onDragOver);
    list.removeEventListener("drop", onDrop);
  };
}

function finishDesktopProfileDrag(row: HTMLElement): void {
  const profileId = row.dataset.profileId;
  if (!profileId) return;

  const list = byId("profile-list");
  const dragRow = row as HTMLElement & { _desktopDragCleanup?: () => void };
  dragRow._desktopDragCleanup?.();
  delete dragRow._desktopDragCleanup;
  delete list.dataset.draggingProfileId;
  row.classList.remove("dragging");
  row.querySelector(".airplane-drag-handle")?.classList.remove("dragging-handle");

  persistProfileOrderFromDom(list, profileId);
}

function beginProfileDrag(event: PointerEvent, row: HTMLElement, handle: HTMLButtonElement): void {
  const profileId = row.dataset.profileId;
  if (!profileId) return;

  event.preventDefault();
  event.stopPropagation();
  const list = byId("profile-list");
  const pointerId = event.pointerId;
  let active = true;

  row.classList.add("dragging");
  handle.setPointerCapture(pointerId);

  const move = (moveEvent: PointerEvent): void => {
    if (!active || moveEvent.pointerId !== pointerId) return;
    moveEvent.preventDefault();
    moveProfileRowAtY(list, row, moveEvent.clientY);
  };

  const finish = (finishEvent: PointerEvent): void => {
    if (!active || finishEvent.pointerId !== pointerId) return;
    active = false;
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", finish);
    handle.removeEventListener("pointercancel", finish);
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    row.classList.remove("dragging");
    persistProfileOrderFromDom(list, profileId);
  };

  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
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

  syncSelectPreviousValues();
  persistInputState();
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
  byId("main-menu").classList.remove("open");
  if (action === "clear") {
    if (confirm("Are you sure you want to clear the inputs?")) clearInputs();
  } else if (action === "import") {
    (byId("profile-import") as HTMLInputElement).click();
  } else if (action === "export") {
    exportProfileFile();
  } else if (action === "settings") {
    openSettings();
  } else if (action === "about") {
    (byId("about-dialog") as HTMLDialogElement).showModal();
  }
}

function persistInputState(): void {
  const state: Record<string, string> = {};
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".calc-control").forEach((el) => {
    state[el.id] = el.value;
  });
  localStorage.setItem(INPUT_STATE_KEY, JSON.stringify(state));
}

function restoreInputState(): void {
  let state: Record<string, string>;
  try {
    state = JSON.parse(localStorage.getItem(INPUT_STATE_KEY) ?? "{}");
  } catch {
    return;
  }

  const typeIds = fields.map((field) => `${field.id}-type`);
  for (const id of typeIds) {
    const el = document.getElementById(id) as HTMLSelectElement | null;
    if (el && state[id] && Array.from(el.options).some((option) => option.value === state[id])) {
      el.value = state[id];
      updateTypeSelectDisplay(el);
    }
  }
  normalizeDependentUnits();

  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".calc-control").forEach((el) => {
    const saved = state[el.id];
    if (saved === undefined) return;
    if (el instanceof HTMLSelectElement) {
      if (Array.from(el.options).some((option) => option.value === saved)) {
        el.value = saved;
        if (el.id.endsWith("-type")) updateTypeSelectDisplay(el);
      }
    } else {
      el.value = saved;
    }
  });
}

function loadOutputSettings(): OutputSettings {
  const defaults: OutputSettings = {
    altitude: "ft",
    pressure: "mbar",
    temperature: "°C",
    speed: "kt",
    angle: "rad",
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
  syncSettingChoiceButtons();
  byId("settings-dialog").classList.add("open");
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
  byId("settings-dialog").classList.remove("open");
  recalculate();
}

function applyTheme(): void {
  document.documentElement.dataset.theme = settings.theme;
}

function clearInputs(): void {
  const ids = ["alt","temp","spd","weight","sref","cref","clmax","nz","angle1","angle2","headWind","crossWind","windRef"];
  for (const id of ids) (byId(`${id}-value`) as HTMLInputElement).value = "";
  (byId("spdDelta-value") as HTMLInputElement).value = "";
  persistInputState();
  recalculate();
}

function exportProfileFile(): void {
  const blob = new Blob([exportAndroidProfiles(profiles)], { type: "text/plain;charset=US-ASCII" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "airplanes.txt";
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
    for (const profile of imported) {
      profiles = upsertProfile(profiles, profile);
    }
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

function handleTypeSelectionChange(selectElement: HTMLSelectElement): void {
  const previous = selectElement.dataset.previousValue ?? selectElement.value;
  if (previous === selectElement.value) return;

  const clear = (id: string): void => {
    (byId(`${id}-value`) as HTMLInputElement).value = "";
  };

  switch (selectElement.id) {
    case "alt-type":
      clear("alt");
      break;
    case "temp-type":
      clear("temp");
      break;
    case "spd-type":
      clear("spd");
      (byId("spdDelta-value") as HTMLInputElement).value = "";
      break;
    case "nz-type":
      clear("nz");
      break;
    case "angle1-type":
      clear("angle1");
      break;
    case "angle2-type":
      clear("angle2");
      break;
    case "headWind-type":
      clear("headWind");
      clear("crossWind");
      clear("windRef");
      break;
  }
}

function convertInputForUnitChange(unitSelect: HTMLSelectElement): void {
  const previousUnit = unitSelect.dataset.previousValue;
  const newUnit = unitSelect.value;
  if (!previousUnit || previousUnit === newUnit) return;

  const fieldId = unitSelect.id.replace(/-unit$/, "");
  const input = document.getElementById(`${fieldId}-value`) as HTMLInputElement | null;
  if (!input || !input.value.trim()) return;

  const parsed = Number(input.value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return;

  let converted: number | null = null;
  if (fieldId === "alt") {
    if (selectValue("alt-type") === "P") {
      converted = units.pressureToPa(parsed, previousUnit) / units.pressureToPa(1, newUnit);
    } else {
      converted = units.lengthToM(parsed, previousUnit) / units.lengthToM(1, newUnit);
    }
  } else if (fieldId === "temp") {
    if (selectValue("temp-type") === "Δ ISA") {
      const deltaK = units.temperatureDeltaToK(parsed, previousUnit);
      converted = newUnit === "°F" ? deltaK * 9 / 5 : deltaK;
    } else {
      converted = temperatureFromK(units.temperatureToK(parsed, previousUnit), newUnit);
    }
  } else if (fieldId === "spd") {
    const speedType = selectValue("spd-type");
    if (speedType === "Qdyn" || speedType === "Qc") {
      converted = units.pressureToPa(parsed, previousUnit) / units.pressureToPa(1, newUnit);
    } else if (!["Mach", "CL", "Vs Factor"].includes(speedType)) {
      converted = units.speedToMS(parsed, previousUnit) / units.speedToMS(1, newUnit);
    }
  } else if (fieldId === "weight") {
    converted = units.massToKg(parsed, previousUnit) / units.massToKg(1, newUnit);
  } else if (fieldId === "sref") {
    converted = units.areaToM2(parsed, previousUnit) / units.areaToM2(1, newUnit);
  } else if (fieldId === "cref") {
    converted = lengthAnyToM(parsed, previousUnit) / lengthAnyToM(1, newUnit);
  } else if (["angle1", "angle2", "windRef"].includes(fieldId)) {
    converted = units.angleToRad(parsed, previousUnit) / units.angleToRad(1, newUnit);
  } else if (fieldId === "headWind" || fieldId === "crossWind") {
    converted = units.speedToMS(parsed, previousUnit) / units.speedToMS(1, newUnit);
  }

  if (converted !== null && Number.isFinite(converted)) {
    input.value = formatEditableNumber(converted);
  }
}

function temperatureFromK(kelvin: number, unit: string): number {
  if (unit === "°C") return kelvin - 273.15;
  if (unit === "°F") return (kelvin - 273.15) * 9 / 5 + 32;
  return kelvin;
}

function formatEditableNumber(value: number): string {
  const rounded = Math.round(value * 1e9) / 1e9;
  return String(rounded);
}

function syncSelectPreviousValues(): void {
  document.querySelectorAll<HTMLSelectElement>("select").forEach((selectElement) => {
    selectElement.dataset.previousValue = selectElement.value;
  });
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
  const speedDeltaLabel = byId("spdDelta-label") as HTMLButtonElement;
  const speedInput = byId("spd-value") as HTMLInputElement;
  const speedRow = document.querySelector<HTMLElement>('[data-field="spd"]');
  const isVsFactor = speedType === "Vs Factor";
  speedRow?.classList.toggle("vs-factor-mode", isVsFactor);
  speedDeltaLabel.hidden = !isVsFactor;
  if (isVsFactor) {
    speedUnit.hidden = true;
    speedDelta.hidden = false;
    speedInput.placeholder = "Factor";
  } else {
    speedUnit.hidden = false;
    speedDelta.hidden = true;
    speedInput.placeholder = speedType === "Mach" ? "Mach" : speedType === "CL" ? "Lift coefficient" : "Speed";
    if (speedType === "Mach" || speedType === "CL") {
      preserveSelect(speedUnit, ["—"], "—");
    } else if (speedType === "Qdyn" || speedType === "Qc") {
      preserveSelect(speedUnit, ["mbar", "Pa", "hPa", "atm", "mmHg", "psi"], "mbar");
    } else {
      preserveSelect(speedUnit, ["kt", "m/s", "km/h", "mph", "ft/s"], "kt");
    }
  }

  const nzType = selectValue("nz-type");
  preserveSelect(select("nz-unit"), nzType === "BankTurn" ? ["deg"] : ["g"], nzType === "BankTurn" ? "deg" : "g");

  const windMode = selectValue("headWind-type");
  const crossRow = document.querySelector<HTMLElement>('[data-field="crossWind"]');
  const windRefType = select("windRef-type");
  if (crossRow) crossRow.hidden = windMode === "Wind Speed";
  if (windMode === "Wind Speed") {
    preserveSelect(windRefType, ["Wind Direction"], "Wind Direction");
  } else {
    preserveSelect(windRefType, ["Runway Angle"], "Runway Angle");
  }

  for (const field of fields) updateInputHelpers(field.id);
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
    const nzType = selectValue("nz-type");
    if (nzType === "BankTurn") {
      bank = units.angleToRad(num("nz-value"), "deg");
      nz = loadFactorFromBank(bank);
    } else {
      nz = num("nz-value");
      bank = nzType === "NzTurn" && nz >= 1 ? bankFromLoadFactor(nz) : nzType === "NzTurn" ? Number.NaN : 0;
    }

    const stallInputsValid = mass > 0 && atmosphere.densityKgM3 > 0 && sref > 0 && clmax > 0;
    const vsTas = stallInputsValid
      ? stallSpeedTas1g(mass, atmosphere.densityKgM3, sref, clmax)
      : Number.NaN;
    const vsCas = Number.isFinite(vsTas) ? tasToCas(vsTas, atmosphere) : Number.NaN;

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
    const cl = q > 0 && sref > 0 ? liftCoefficient(mass, nz, q, sref) : Number.NaN;
    const vsFactor = Number.isFinite(vsCas) && vsCas > 0 ? cas / vsCas : Number.NaN;
    const reynolds = atmosphere.densityKgM3 * tas * cref / mu;

    const pressureRatio = atmosphere.pressurePa / P0;
    const densityRatio = atmosphere.densityKgM3 / RHO0;
    const tempRatio = atmosphere.temperatureK / T0;
    const turnRadiusM = Math.abs(Math.tan(bank)) > 1e-12 ? tas ** 2 / (G0 * Math.tan(bank)) : Number.NaN;
    const turnRate = tas > 0 ? G0 * Math.tan(bank) / tas : Number.NaN;

    const outputs: Record<string, string> = {
      "Pressure Altitude": formatLength(pressureAltitudeM),
      "Geometric Altitude": formatLength(geometricAltitudeM),
      "Geopotential Altitude": formatLength(geopotentialAltitudeM),
      "Density Altitude": formatLength(densityAltitudeM),
      "Temperature Altitude": formatLength(temperatureAltitudeM),
      "Pressure": formatPressure(atmosphere.pressurePa),
      "Density": formatScalarWithUnit(atmosphere.densityKgM3, 3, "kg/m³"),
      "Temperature": formatTemperature(atmosphere.temperatureK),
      "Delta ISA": formatTemperatureDelta(deltaIsa),
      "Total Temperature": formatTemperature(totalT),
      "Viscosity": `${fmt(mu * 1e5, 3)} × 10⁻⁵ kg/m/s`,
      "Sound Speed": formatSpeed(atmosphere.speedOfSoundMS),
      "True Airspeed": formatSpeed(tas),
      "Calibrated Airspeed": formatSpeed(cas),
      "Equivalent Airspeed": formatSpeed(eas),
      "Ground Speed": formatSpeed(windSolution.groundSpeedMS),
      "Stall Speed Vs": formatSpeed(vsCas),
      "Vs Factor": fmt(vsFactor, 3),
      "Lift Coefficient CL": fmt(cl, 3),
      "Mach": fmt(mach, 3),
      "Reynolds": `${fmt(reynolds / 1e6, 2)} × 10⁶`,
      "Pressure Ratio δ": fmt(pressureRatio, 3),
      "Density Ratio σ": fmt(densityRatio, 3),
      "Temperature Ratio θ": fmt(tempRatio, 3),
      "Dynamic Pressure": formatPressure(q),
      "Impact Pressure": formatPressure(qc),
      "Total Pressure": formatPressure(totalP),
      "DynPressure * S / g": formatScalarWithUnit(q * sref / G0, 1, "kgf"),
      "Lift Force": formatScalarWithUnit(cl * q * sref / G0, 1, "kgf"),
      "Weight/Delta W/δ": formatScalarWithUnit(mass / pressureRatio, 1, "kgf"),
      "Load Factor Nz": formatScalarWithUnit(nz, 2, "g"),
      "Bank Angle φ": formatPlainAngle(bank),
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
      `Valid solution · Hₚ = ${fmt(pressureAltitudeM, 1)} m · M = ${fmt(mach, 3)} · GS = ${fmt(windSolution.groundSpeedMS / (1852 / 3600), 1)} kt`,
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
    if (!Number.isFinite(vsCas)) throw new Error("Vs Factor requires valid mass, reference area, and maximum lift coefficient.");
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

function formatScalarWithUnit(value: number, digits: number, unit: string): string {
  if (!Number.isFinite(value)) return "----";
  return `${fmt(value, digits)} ${unit}`;
}

function formatPlainAngle(rad: number): string {
  if (!Number.isFinite(rad)) return "----";
  const value = settings.angle === "deg" ? rad * 180 / Math.PI : rad;
  return `${fmt(value, 2)} ${settings.angle}`;
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
  updateTypeSelectDisplay(el);
}

function num(id: string): number {
  const raw = (byId(id) as HTMLInputElement).value.trim().replace(",", ".");
  if (!raw) {
    if (["weight-value", "sref-value", "cref-value", "clmax-value"].includes(id)) return 1;
    if (id === "nz-value") return selectValue("nz-type") === "BankTurn" ? 0 : 1;
    return 0;
  }
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
