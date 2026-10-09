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
  "Hp": "ISA altitude corresponding to the local static pressure. Positive: pressure below ISA sea-level pressure.",
  "Hg": "Geometric height above mean sea level. Positive: above mean sea level.",
  "P": "Absolute static pressure of the surrounding air, related to density and absolute temperature by the ideal gas law.",
  "Δ ISA": "Difference between actual static air temperature and ISA temperature at the same pressure altitude. Positive: warmer than ISA.",
  "OAT": "Static temperature of the surrounding air.",
  "TAS": "Magnitude of aircraft velocity relative to the surrounding air. Nonnegative.",
  "CAS": "Airspeed at ISA sea-level conditions producing the same impact pressure as the actual flight condition. Nonnegative.",
  "EAS": "Airspeed at ISA sea-level conditions producing the same dynamic pressure as the actual flight condition. Nonnegative.",
  "Mach": "Ratio of true airspeed to local speed of sound. Nonnegative.",
  "CL": "Aerodynamic lift divided by the product of dynamic pressure and wing reference area. Positive: lift toward the aircraft upper side.",
  "Vs Factor": "Input multiplier applied to reference 1-g stall speed in CAS, with an optional additive CAS increment. Nonnegative multiplier.",
  "Ground Speed": "Magnitude of aircraft horizontal velocity relative to the ground. Nonnegative.",
  "Qdyn": "Kinetic energy per unit volume of the air-relative flow. Nonnegative.",
  "Qc": "Difference between stagnation pressure and static pressure. Nonnegative in the adopted subsonic model.",
  "Weight": "Aircraft weight, expressed as mass in the selected units for aerodynamic calculations. Nonnegative.",
  "Sref": "Wing reference area used to define aerodynamic coefficients. Positive area.",
  "cref": "Wing reference chord used to calculate Reynolds number. Positive length.",
  "CLmax": "Maximum lift coefficient attainable at the onset of stall for the selected aircraft configuration. Positive coefficient.",
  "NzPullup": "Ratio of aerodynamic lift to aircraft weight in an unbanked maneuver. Positive: lift toward the aircraft upper side.",
  "NzTurn": "Load factor in a coordinated level turn. Positive and not less than 1 in the adopted model.",
  "BankTurn": "Aircraft bank angle in a coordinated level turn. Positive: right wing down.",
  "Track": "Direction of the aircraft horizontal ground-velocity vector, measured clockwise from true north. Positive: clockwise (ground-velocity vector to the right).",
  "Heading": "Direction in which the aircraft nose points, measured clockwise from true north. Positive: clockwise (nose to the right).",
  "Sideslip": "Angle between the aircraft longitudinal axis and the incoming relative wind. Positive: relative wind coming from the right.",
  "Drift": "Angular difference between heading and ground track (heading minus track). Positive: heading to the right of track.",
  "HeadWind": "Wind component along the selected runway/reference direction. Positive: wind from ahead. Negative: tailwind.",
  "Wind Speed": "Magnitude of horizontal wind velocity. Nonnegative.",
  "CrossWind": "Wind component perpendicular to the selected runway/reference direction. Positive: wind coming from the right. Negative: wind from the left.",
  "Runway Angle": "Direction of the selected runway/reference axis, measured clockwise from true north. Positive: clockwise (reference direction to the right).",
  "Wind Direction": "Direction from which the wind blows, measured clockwise from true north. Positive: clockwise (wind-from direction to the right).",
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
  Hp: "Altitude H<sub class='hp-sub'>P</sub>",
  Hg: "Altitude H<sub>GEOM</sub>",
  P: "Static Pressure",
  OAT: "Temperature OAT",
  TAS: "Airspeed TAS",
  CAS: "Airspeed CAS",
  EAS: "Airspeed EAS",
  CL: "C<sub>L</sub>",
  "Vs Factor": "V<sub>S</sub> Factor",
  Qdyn: "Dynamic Pressure",
  Qc: "Impact Pressure",
  Sref: "Area S<sub>REF</sub>",
  cref: "Chord c<sub>REF</sub>",
  CLmax: "C<sub>L,MAX</sub>",
  NzPullup: "N<sub>Z</sub>&nbsp;(Pull-up)",
  NzTurn: "N<sub>Z</sub>&nbsp;(Turn)",
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
  { id: "sref", typeOptions: [{ value: "Sref", label: "Area S<sub>REF</sub>" }], unitOptions: opts(["m²", "ft²", "in²", "cm²", "mm²"]), defaultType: "Sref", defaultUnit: "m²", placeholder: "Reference area", defaultValue: "1" },
  { id: "cref", typeOptions: [{ value: "cref", label: "Chord c<sub>REF</sub>" }], unitOptions: opts(["m", "ft", "in", "cm", "mm"]), defaultType: "cref", defaultUnit: "m", placeholder: "Reference chord", defaultValue: "1" },
  { id: "clmax", typeOptions: [{ value: "CLmax", label: "C<sub>L,MAX</sub>" }], unitOptions: [{ value: "-", label: "—" }], defaultType: "CLmax", defaultUnit: "-", placeholder: "Maximum lift coefficient", defaultValue: "1" },
  { id: "nz", typeOptions: [{ value: "NzPullup", label: "N<sub>Z</sub>&nbsp;(Pull-up)" }, { value: "NzTurn", label: "N<sub>Z</sub>&nbsp;(Turn)" }, { value: "BankTurn", label: "Bank Angle" }], unitOptions: opts(["g", "deg"]), defaultType: "NzPullup", defaultUnit: "g", placeholder: "Load factor", defaultValue: "1" },
  { id: "angle1", typeOptions: opts(["Track", "Heading"]), unitOptions: opts(["deg", "rad"]), defaultType: "Track", defaultUnit: "deg", placeholder: "Angle", defaultValue: "0" },
  { id: "angle2", typeOptions: opts(["Sideslip", "Drift"]), unitOptions: opts(["deg", "rad"]), defaultType: "Sideslip", defaultUnit: "deg", placeholder: "Angle", defaultValue: "0" },
  { id: "headWind", typeOptions: [{ value: "HeadWind", label: "HeadWind" }, { value: "Wind Speed", label: "Wind Speed" }], unitOptions: opts(["kt", "m/s", "km/h"]), defaultType: "HeadWind", defaultUnit: "kt", placeholder: "Wind", defaultValue: "0" },
  { id: "crossWind", typeOptions: [{ value: "CrossWind", label: "CrossWind" }], unitOptions: opts(["kt", "m/s", "km/h"]), defaultType: "CrossWind", defaultUnit: "kt", placeholder: "Crosswind", defaultValue: "0" },
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
  "Pressure Altitude": "Pressure Altitude <span class='result-symbol'>H<sub class='hp-sub'>P</sub></span>",
  "Geometric Altitude": "Geometric Altitude <span class='result-symbol'>H<sub>GEOM</sub></span>",
  "Geopotential Altitude": "Geopotential Altitude <span class='result-symbol'>H<sub>G</sub></span>",
  "Density Altitude": "Density Altitude <span class='result-symbol'>H<sub>ρ</sub></span>",
  "Temperature Altitude": "Temperature Altitude <span class='result-symbol'>H<sub>T</sub></span>",
  "Pressure": "Pressure p",
  "Density": "Density ρ",
  "Temperature": "Temperature OAT",
  "Delta ISA": "Δ ISA",
  "Total Temperature": "Total Air Temperature <span class='result-symbol'>TAT</span>",
  "Viscosity": "Viscosity μ",
  "Sound Speed": "Sound Speed a",
  "Stall Speed Vs": "Stall Speed V<sub>S</sub>",
  "Vs Factor": "V<sub>S</sub> Factor",
  "Lift Coefficient CL": "Lift Coefficient C<sub>L</sub>",
  "Reynolds": "Reynolds Re",
  "Dynamic Pressure": "Dynamic Pressure q",
  "Impact Pressure": "Impact Pressure q<sub>c</sub>",
  "Total Pressure": "Total Pressure p<sub>T</sub>",
  "DynPressure * S / g": "q S / g₀",
  "Weight/Delta W/δ": "Weight / δ",
  "Load Factor Nz": "Load Factor N<sub>Z</sub>",
  "AlongTrack Headwind": "Along-Track Headwind",
  "AlongTrack Crosswind": "Along-Track Crosswind",
};

const RESULT_HELPERS: Record<string, string> = {
  "Pressure Altitude": "ISA altitude corresponding to the local static pressure. Positive: pressure below ISA sea-level pressure.",
  "Geometric Altitude": "Geometric height above mean sea level. Positive: above mean sea level.",
  "Geopotential Altitude": "Altitude equivalent to gravitational potential energy per unit mass under constant standard gravity. Positive: above the reference datum.",
  "Density Altitude": "ISA altitude corresponding to the actual air density. Positive: above ISA sea level.",
  "Temperature Altitude": "Tropospheric ISA altitude corresponding to actual static temperature, limited to 11 km in this model. Positive: above ISA sea level.",
  "Pressure": "Absolute static pressure of the surrounding air, related to density and absolute temperature by the ideal gas law.",
  "Density": "Mass of air per unit volume, calculated from static pressure and absolute temperature using the ideal gas law. Positive scalar.",
  "Temperature": "Static temperature of the surrounding air.",
  "Delta ISA": "Difference between actual static air temperature and ISA temperature at the same pressure altitude. Positive: warmer than ISA.",
  "Total Temperature": "Stagnation temperature obtained by adiabatically bringing the air-relative flow to rest.",
  "Viscosity": "Dynamic viscosity of air relates shear stress to velocity gradient; its temperature dependence is modeled by Sutherland's law. Positive scalar.",
  "Sound Speed": "Speed of propagation of small pressure disturbances in the surrounding air. Positive scalar.",
  "True Airspeed": "Magnitude of aircraft velocity relative to the surrounding air. Nonnegative.",
  "Calibrated Airspeed": "Airspeed at ISA sea-level conditions producing the same impact pressure as the actual flight condition. Nonnegative.",
  "Equivalent Airspeed": "Airspeed at ISA sea-level conditions producing the same dynamic pressure as the actual flight condition. Nonnegative.",
  "Ground Speed": "Magnitude of aircraft horizontal velocity relative to the ground. Nonnegative.",
  "Stall Speed Vs": "Reference 1-g calibrated airspeed at which the required lift coefficient equals CLmax for the selected aircraft mass and configuration. Nonnegative.",
  "Vs Factor": "Ratio of current calibrated airspeed to reference 1-g stall speed in CAS. Nonnegative.",
  "Lift Coefficient CL": "Aerodynamic lift divided by the product of dynamic pressure and wing reference area. Positive: lift toward the aircraft upper side.",
  "Mach": "Ratio of true airspeed to local speed of sound. Nonnegative.",
  "Reynolds": "Ratio of inertial to viscous effects based on true airspeed and reference chord. Nonnegative.",
  "Pressure Ratio δ": "Ratio of local static pressure to standard sea-level pressure. Positive scalar.",
  "Density Ratio σ": "Ratio of local air density to standard sea-level density. Positive scalar.",
  "Temperature Ratio θ": "Ratio of local absolute temperature to standard sea-level absolute temperature. Positive scalar.",
  "Dynamic Pressure": "Kinetic energy per unit volume of the air-relative flow. Nonnegative.",
  "Impact Pressure": "Difference between stagnation pressure and static pressure. Nonnegative in the adopted subsonic model.",
  "Total Pressure": "Stagnation pressure of the air-relative flow under isentropic conditions.",
  "DynPressure * S / g": "Aerodynamic reference force qS expressed numerically in kilogram-force (kgf). Nonnegative.",
  "Lift Force": "Aerodynamic lift force required by the selected load factor. Positive: lift toward the aircraft upper side.",
  "Weight/Delta W/δ": "Aircraft weight divided by atmospheric pressure ratio δ. Positive for positive aircraft weight.",
  "Load Factor Nz": "Ratio of aerodynamic lift to aircraft weight. Positive: lift toward the aircraft upper side.",
  "Bank Angle φ": "Aircraft bank angle in a coordinated level turn. Positive: right wing down.",
  "Turn Radius": "Signed radius of a coordinated level turn relative to the air mass. Positive: right turn. Negative: left turn.",
  "Turn Rate": "Rate of change of aircraft heading in a coordinated level turn. Positive: clockwise (right turn).",
  "Track Angle": "Direction of the aircraft horizontal ground-velocity vector, measured clockwise from true north. Positive: clockwise (ground-velocity vector to the right).",
  "Heading Angle Ψ": "Direction in which the aircraft nose points, measured clockwise from true north. Positive: clockwise (nose to the right).",
  "Drift Angle": "Angular difference between heading and ground track (heading minus track). Positive: heading to the right of track.",
  "Sideslip Angle β": "Angle between the aircraft longitudinal axis and the incoming relative wind. Positive: relative wind coming from the right.",
  "Wind Speed": "Magnitude of horizontal wind velocity. Nonnegative.",
  "Wind Direction": "Direction from which the wind blows, measured clockwise from true north. Positive: clockwise (wind-from direction to the right).",
  "AlongTrack Headwind": "Wind component along the aircraft ground track. Positive: wind from ahead. Negative: tailwind.",
  "AlongTrack Crosswind": "Wind component perpendicular to the aircraft ground track. Positive: wind coming from the right. Negative: wind from the left.",
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
let editorSnapshot = "";

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

    <div class="modal-overlay menu-overlay" id="main-menu" aria-hidden="true">
      <div class="menu-sheet">
        <div class="modal-handle"></div>
        <div class="sheet-header">
          <strong>Menu</strong>

        </div>
        <button type="button" class="sheet-item" data-menu="clear"><span>Clear Inputs</span><small>Reset all flight-condition entries</small></button>
        <button type="button" class="sheet-item" data-menu="import"><span>Import Airplanes</span><small>Restore or merge aircraft profiles</small></button>
        <button type="button" class="sheet-item" data-menu="export"><span>Export Airplanes</span><small>Back up all saved aircraft profiles</small></button>
        <button type="button" class="sheet-item" data-menu="settings"><span>Settings</span><small>Display, units, precision and aircraft data</small></button>
        <a class="sheet-item" id="feedback-link" href="mailto:flightdyn@gmail.com?subject=AeroCalculator%20Feedback"><span>Send Feedback</span><small>Rate the app or send feedback by e-mail</small></a>
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
          <div class="editor-row editor-name-row"><label for="profile-name">Name</label><input id="profile-name" type="text" /></div>
          <div class="editor-row"><label for="profile-sref">Area S<sub>REF</sub></label><input id="profile-sref" inputmode="decimal" /><select id="profile-sref-unit" aria-label="Reference area unit"><option>m²</option><option>ft²</option><option>in²</option><option>cm²</option><option>mm²</option></select></div>
          <div class="editor-row"><label for="profile-cref">Chord c<sub>REF</sub></label><input id="profile-cref" inputmode="decimal" /><select id="profile-cref-unit" aria-label="Reference chord unit"><option>m</option><option>ft</option><option>in</option><option>cm</option><option>mm</option></select></div>
          <section class="editor-section">
            <div class="editor-section-head"><strong>Weight</strong><select id="profile-weight-unit" aria-label="Aircraft weight unit"><option>kg</option><option>lb</option><option>ton</option><option>slug</option><option>oz</option></select></div>
            <div class="weight-grid"><label>MTOW<input id="profile-weight-MTOW" inputmode="decimal" /></label><label>MLW<input id="profile-weight-MLW" inputmode="decimal" /></label><label>MZFW<input id="profile-weight-MZFW" inputmode="decimal" /></label><label>BOW<input id="profile-weight-BOW" inputmode="decimal" /></label><label>Heavy<input id="profile-weight-Heavy" inputmode="decimal" /></label><label>Light<input id="profile-weight-Light" inputmode="decimal" /></label></div>
          </section>
          <section class="editor-section">
            <div class="editor-section-head"><strong>C<sub>L,MAX</sub></strong><div class="flap-actions"><button type="button" id="add-flap" class="add-flap" aria-label="Add flap maximum lift coefficient">＋</button><button type="button" id="remove-flap" class="add-flap" aria-label="Remove last flap maximum lift coefficient">−</button></div></div>
            <div class="flap-grid" id="flap-grid"><label data-flap-row="0" hidden>Flap 0<input id="profile-flap-0" inputmode="decimal" /></label><label data-flap-row="1" hidden>Flap 1<input id="profile-flap-1" inputmode="decimal" /></label><label data-flap-row="2" hidden>Flap 2<input id="profile-flap-2" inputmode="decimal" /></label><label data-flap-row="3" hidden>Flap 3<input id="profile-flap-3" inputmode="decimal" /></label><label data-flap-row="4" hidden>Flap 4<input id="profile-flap-4" inputmode="decimal" /></label><label data-flap-row="5" hidden>Flap 5<input id="profile-flap-5" inputmode="decimal" /></label><label data-flap-row="6" hidden>Flap 6<input id="profile-flap-6" inputmode="decimal" /></label><label data-flap-row="7" hidden>Flap 7<input id="profile-flap-7" inputmode="decimal" /></label><label data-flap-row="8" hidden>Flap 8<input id="profile-flap-8" inputmode="decimal" /></label><label data-flap-row="9" hidden>Flap 9<input id="profile-flap-9" inputmode="decimal" /></label><label data-flap-row="10" hidden>Flap 10<input id="profile-flap-10" inputmode="decimal" /></label><label data-flap-row="11" hidden>Flap 11<input id="profile-flap-11" inputmode="decimal" /></label><label data-flap-row="12" hidden>Flap 12<input id="profile-flap-12" inputmode="decimal" /></label><label data-flap-row="13" hidden>Flap 13<input id="profile-flap-13" inputmode="decimal" /></label></div>
          </section>
          <div class="editor-actions" id="profile-delete-wrap" hidden>
            <button type="button" class="danger-button" id="profile-delete">Delete Airplane</button>
          </div>
        </div>
      </form>
    </dialog>

    <dialog class="simple-dialog about-dialog" id="about-dialog">
      <div class="about-header">
        <span>About</span>

      </div>
      <div class="about-content">
        <img src="${iconUrl}" alt="" />
        <h2>Aero Calculator</h2>
        <p>Browser edition</p>
        <p>Gustavo José Zambrano</p>
        <button type="button" class="about-ok" data-close-dialog="about-dialog">OK</button>
      </div>
    </dialog>
    <div class="modal-overlay settings-overlay" id="settings-dialog" aria-hidden="true">
      <div class="settings-dialog settings-sheet">
        <div class="modal-handle"></div>
        <form id="settings-form">
          <div class="settings-header"><span>Settings</span></div>
          <div class="settings-body">
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
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Number Format</span><span class="setting-desc">Standard precision or one extra decimal place</span></div>
            <select id="setting-number-format" class="setting-native-select" aria-label="Number Format"><option>Standard</option><option>+1 decimal</option></select>
            <button type="button" class="setting-choice" data-setting-select="setting-number-format" data-setting-title="Number Format"></button>
          </div>

          <h3>AIRCRAFT DATA</h3>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Import Airplanes</span><span class="setting-desc">Restore or merge aircraft profiles from a backup</span></div>
            <button type="button" class="setting-btn" id="setting-import-btn">Import</button>
          </div>
          <div class="setting-row">
            <div class="setting-text"><span class="setting-title">Export Airplanes</span><span class="setting-desc">Back up all saved aircraft profiles</span></div>
            <button type="button" class="setting-btn" id="setting-export-btn">Export</button>
          </div>
          </div>
          <div class="dialog-buttons settings-footer">
            <button type="button" id="settings-cancel">Cancel</button>
            <button type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: CONTEXTUAL HELP & TOOLTIP WITH LATEX (RotorCalculator standard) -->
    <div class="modal-overlay help-overlay" id="modal-result-tooltip" aria-hidden="true">
      <div class="modal-card help-sheet">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title" id="result-tooltip-title">About • Parameter</div>

        </div>
        <div class="modal-body">
          <div id="result-tooltip-desc" style="font-size: 14.5px; line-height: 1.6; color: var(--button-text); margin-bottom: 14px;"></div>
          <div id="result-tooltip-eq-box" style="display: none;"></div>
          <div id="result-tooltip-range-box" style="display: none; font-size: 13.5px; margin-bottom: 10px;">
            <span class="help-model-hdr">Model Physics: </span>
            <span id="result-tooltip-range-text" style="color: var(--button-text);"></span>
          </div>
          <div id="result-tooltip-unit-box" style="display: none; font-size: 13.5px; margin-bottom: 16px;">
            <span class="help-unit-hdr">SI / Reference Unit: </span>
            <span id="result-tooltip-unit-text" style="color: var(--button-text); font-weight: 700;"></span>
          </div>
          <button type="button" class="action-btn" id="btn-result-tooltip-ok" style="width: 100%; height: 42px; font-weight: 700; color: var(--accent); background: var(--button-a); border: 1px solid var(--button-border); border-radius: 8px; cursor: pointer;">OK</button>
        </div>
      </div>
    </div>

    <!-- MODAL: FIELD OPTION SELECTOR (Bottom Sheet Picker) -->
    <div class="modal-overlay" id="modal-options-selector" aria-hidden="true">
      <div class="modal-card options-modal-card">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title" id="options-selector-title">Select Option</div>

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

function setOverlayOpen(id: string, open: boolean): void {
  const overlay = byId(id);
  overlay.classList.toggle("open", open);
  overlay.setAttribute("aria-hidden", open ? "false" : "true");
}

export function showContextualHelp(key: string): void {
  const item = CATALOG[key] || {
    title: key,
    desc: RESULT_HELPERS[key] || `Technical documentation for ${key}.`,
    eq: "",
    model: "",
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

  const editor = byId("profile-editor") as HTMLDialogElement;
  (editor.open ? editor : app!).append(byId("modal-result-tooltip"));
  setOverlayOpen("modal-result-tooltip", true);
}

(window as unknown as { showContextualHelp: typeof showContextualHelp }).showContextualHelp = showContextualHelp;

const closeTooltipModal = () => {
  setOverlayOpen("modal-result-tooltip", false);
  app.append(byId("modal-result-tooltip"));
};
byId("btn-result-tooltip-ok")?.addEventListener("click", closeTooltipModal);
byId("modal-result-tooltip")?.addEventListener("click", (e) => {
  if (e.target === byId("modal-result-tooltip")) closeTooltipModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && byId("modal-result-tooltip")?.classList.contains("open")) {
    e.preventDefault();
    closeTooltipModal();
  }
});

function installTechnicalHold(target: HTMLElement, keyProvider: () => string): void {
  let timer: number | undefined;
  let fired = false;
  let downX = 0;
  let downY = 0;

  const clearTimer = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };

  target.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    fired = false;
    downX = event.clientX;
    downY = event.clientY;
    clearTimer();
    timer = window.setTimeout(() => {
      fired = true;
      vibrateTap();
      showContextualHelp(keyProvider());
    }, 550);
  });

  target.addEventListener("pointerup", (event) => {
    clearTimer();
    if (fired) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  target.addEventListener("pointermove", (event) => {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 10) clearTimer();
  });
  target.addEventListener("pointercancel", clearTimer);
  target.addEventListener("pointerleave", clearTimer);

  target.addEventListener("click", (event) => {
    if (!fired) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fired = false;
  }, true);

  target.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    clearTimer();
    fired = false;
    showContextualHelp(keyProvider());
  });
}

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
  sref: "Wing Area",
  cref: "Reference Chord",
  crossWind: "Wind Input Type",
};

const FIELD_MODAL_OPTION_LABELS: Record<string, string> = {
  TAS: "TAS",
  CAS: "CAS",
  EAS: "EAS",
  Mach: "Mach",
  CL: "Lift Coefficient",
  "Vs Factor": "Stall-Speed Factor",
  "Ground Speed": "Ground Speed",
  Qdyn: "Dynamic Pressure",
  Qc: "Impact Pressure",
  Weight: "Custom Mass",
  CLmax: "Custom Maximum Lift Coefficient",
  Hp: "Pressure Altitude",
  Hg: "Geometric Altitude",
  P: "Pressure",
  "Δ ISA": "Δ ISA",
  OAT: "Outside Air Temperature",
  NzPullup: "Normal Load Factor (Pull-up)",
  NzTurn: "Normal Load Factor (Wind-up Turn)",
  BankTurn: "Bank Angle (Wind-up Turn)",
  Track: "Track Angle (Course)",
  Heading: "Heading Angle",
  Sideslip: "Sideslip Angle β",
  Drift: "Drift Angle",
  HeadWind: "Headwind / Crosswind",
  "Wind Speed": "Wind Speed / Wind Direction",
  "Runway Angle": "Runway Reference Angle",
  "Wind Direction": "Wind Direction",
  Sref: "Wing Reference Area",
  cref: "Mean Aerodynamic Chord",
};

const FIELD_OPTION_DESCRIPTIONS: Record<string, string> = {
  // Speed
  TAS: "True airspeed",
  CAS: "Calibrated airspeed",
  EAS: "Equivalent airspeed",
  Mach: "TAS / speed of sound",
  CL: "Aerodynamic lift coefficient",
  "Vs Factor": "Multiple of reference stall speed",
  "Ground Speed": "Speed over ground",
  Qdyn: "Dynamic pressure, ½ ρ TAS²",
  Qc: "Total pressure minus static pressure",

  // Weight
  Weight: "Manual mass entry",
  MTOW: "Maximum takeoff mass",
  MLW: "Maximum landing weight",
  MZFW: "Maximum zero fuel weight",
  BOW: "Basic operating mass",
  Heavy: "Heavy configuration weight",
  Light: "Light configuration weight",

  // Flaps / CLmax
  CLmax: "User-defined maximum lift coefficient",
  "Flap 0": "Flap 0 (clean configuration) maximum lift coefficient",

  // Altitude
  Hp: "Pressure altitude, ISA",
  Hg: "True height above MSL",
  P: "Direct static pressure input",

  // Temperature
  "Δ ISA": "Temperature deviation from ISA",
  OAT: "Outside air temperature",

  // Maneuver
  NzPullup: "Symmetric pull-up: n = L/W",
  NzTurn: "Coordinated turn: enter load factor",
  BankTurn: "Coordinated turn: enter bank angle φ",

  // Angles
  Track: "Course over ground (True North)",
  Heading: "Aircraft nose heading (True North)",
  Sideslip: "Angle between heading and wind",
  Drift: "Angle between heading and track",

  // Wind
  HeadWind: "Runway wind components directly",
  "Wind Speed": "Total wind speed and direction",
  "Runway Angle": "Runway heading (True North)",
  "Wind Direction": "Direction wind blows from (True North)",

  // Geometry
  Sref: "Wing reference planform area",
  cref: "Reference length for Reynolds number",
  CrossWind: "Runway crosswind component directly",
};

const closeOptionsModal = () => {
  setOverlayOpen("modal-options-selector", false);
};

function installOptionsSwipeDismiss(): void {
  const modal = byId("modal-options-selector");
  const card = modal.querySelector<HTMLElement>(".options-modal-card");
  const body = modal.querySelector<HTMLElement>(".options-modal-body");
  if (!card) return;

  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let dragY = 0;
  let dragging = false;
  let suppressClick = false;

  const reset = (): void => {
    card.style.transition = "";
    card.style.transform = "";
    pointerId = null;
    dragY = 0;
    dragging = false;
  };

  card.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button")) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dragY = 0;
    dragging = false;
  }, true);

  const move = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const target = event.target as HTMLElement | null;
    const startedInHeader = target?.closest(".modal-header, .modal-handle") !== null;
    const canPullBody = !body || body.scrollTop <= 1;
    if (!dragging) {
      if (dy <= 10 || Math.abs(dy) <= Math.abs(dx) * 1.15 || (!startedInHeader && !canPullBody)) return;
      dragging = true;
      card.style.transition = "none";
    }
    if (dy < 0) return;
    dragY = dy;
    event.preventDefault();
    card.style.transform = `translateY(${Math.min(dy, 180)}px)`;
  };

  const finish = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    const shouldDismiss = dragging && dragY >= 64;
    if (dragging) {
      suppressClick = true;
      event.preventDefault();
    }
    reset();
    if (shouldDismiss) closeOptionsModal();
  };

  // Window listeners make the gesture reliable even if the finger leaves the handle/card.
  card.addEventListener("pointermove", move, { capture: true, passive: false });
  card.addEventListener("pointerup", finish, { capture: true });
  card.addEventListener("pointercancel", finish, { capture: true });
  card.addEventListener("click", (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
installOptionsSwipeDismiss();
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
  const pickerFieldId = fieldId === "crossWind" ? "headWind" : fieldId;
  const typeSelect = document.getElementById(`${pickerFieldId}-type`) as HTMLSelectElement | null;
  if (!typeSelect || typeSelect.disabled) return;

  const modal = byId("modal-options-selector");
  const titleEl = byId("options-selector-title");
  const listEl = byId("options-selector-list");
  if (!modal || !titleEl || !listEl) return;

  const title = pickerFieldId === "windRef"
    ? (typeSelect.value === "Runway Angle" ? "Runway Angle" : "Wind Direction")
    : (FIELD_MODAL_TITLES[pickerFieldId] ?? "Select Option");
  titleEl.textContent = title;

  listEl.innerHTML = "";
  const currentValue = typeSelect.value;

  Array.from(typeSelect.options).forEach((opt) => {
    const val = opt.value;
    let label = FIELD_MODAL_OPTION_LABELS[val] ?? opt.label ?? val;
    if (val === "Flap 0") label = "Flap 0 (clean)";
    else if (val.startsWith("Flap ")) label = val;

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

  setOverlayOpen("modal-options-selector", true);
}

const UNIT_OPTION_DESCRIPTIONS: Record<string, string> = {
  ft: "Feet — standard aviation",
  m: "Meters — SI unit",
  km: "Kilometers",
  nm: "Nautical miles",
  mi: "Statute miles",
  in: "Inches",
  mbar: "Millibar (hPa)",
  Pa: "Pascal — SI unit",
  hPa: "Hectopascal",
  atm: "Standard atmosphere",
  mmHg: "Millimeters of mercury",
  psi: "Pounds per square inch",
  "°C": "Degrees Celsius",
  "°F": "Degrees Fahrenheit",
  K: "Kelvin — absolute",
  kt: "Knots — aviation standard",
  "m/s": "Meters per second — SI unit",
  "km/h": "Kilometers per hour",
  mph: "Miles per hour",
  "ft/s": "Feet per second",
  kg: "Kilogram — SI unit",
  lb: "Pound — US aviation",
  ton: "Metric tonne (1000 kg)",
  slug: "Slug — US customary",
  oz: "Ounce",
  "m²": "Square meters — SI unit",
  "ft²": "Square feet",
  "in²": "Square inches",
  "cm²": "Square centimeters",
  "mm²": "Square millimeters",
  cm: "Centimeters",
  mm: "Millimeters",
  deg: "Degrees",
  rad: "Radians",
  "—": "Dimensionless quantity — no physical unit",
};

function inputUnitPickerTitle(fieldId: string): string {
  if (fieldId === "alt") return selectValue("alt-type") === "P" ? "Pressure Unit" : "Altitude Unit";
  if (fieldId === "temp") return "Temperature Unit";
  if (fieldId === "spd") {
    const speedType = selectValue("spd-type");
    if (speedType === "Qdyn" || speedType === "Qc") return "Pressure Unit";
    if (speedType === "Mach" || speedType === "CL" || speedType === "Vs Factor") return "Unit";
    return "Speed Unit";
  }
  if (fieldId === "weight") return "Mass Unit";
  if (fieldId === "sref") return "Wing Area Unit";
  if (fieldId === "cref") return "Chord Unit";
  if (fieldId === "headWind" || fieldId === "crossWind") return "Wind Speed Unit";
  return "Angle Unit";
}

function openInputUnitPicker(fieldId: string): void {
  const selectEl = document.getElementById(`${fieldId}-unit`) as HTMLSelectElement | null;
  const modal = byId("modal-options-selector");
  const titleEl = byId("options-selector-title");
  const listEl = byId("options-selector-list");
  if (!selectEl || selectEl.disabled || !modal || !titleEl || !listEl) return;

  titleEl.textContent = inputUnitPickerTitle(fieldId);
  listEl.innerHTML = "";

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

    const desc = fieldId === "angle1" && opt.value === "deg"
      ? "Degrees (0 to 360)"
      : fieldId === "angle1" && opt.value === "rad"
        ? "Radians (0 to 2π)"
        : (UNIT_OPTION_DESCRIPTIONS[opt.value] ?? UNIT_OPTION_DESCRIPTIONS[opt.text]);
    if (desc) {
      const descEl = document.createElement("div");
      descEl.className = "option-desc";
      descEl.textContent = desc;
      textGroup.appendChild(descEl);
    }

    const radio = document.createElement("div");
    radio.className = "option-radio";
    radio.appendChild(Object.assign(document.createElement("div"), { className: "option-radio-inner" }));
    itemEl.append(textGroup, radio);

    const choose = () => {
      vibrateTap();
      if (selectEl.value !== opt.value) {
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      closeOptionsModal();
    };
    itemEl.addEventListener("click", choose);
    itemEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose();
      }
    });
    listEl.appendChild(itemEl);
  });

  setOverlayOpen("modal-options-selector", true);
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
  "setting-altitude": { ft: "Feet — standard aviation", m: "Meters — SI unit", km: "Kilometers", nm: "Nautical miles", mi: "Statute miles", in: "Inches" },
  "setting-pressure": { mbar: "Millibar (hPa)", Pa: "Pascal — SI unit", hPa: "Hectopascal", atm: "Standard atmosphere", mmHg: "Millimeters of mercury", psi: "Pounds per square inch" },
  "setting-temperature": { "°C": "Degrees Celsius", "°F": "Degrees Fahrenheit", K: "Kelvin — absolute" },
  "setting-speed": { kt: "Knots — aviation standard", "m/s": "Meters per second — SI unit", "km/h": "Kilometers per hour", mph: "Miles per hour", "ft/s": "Feet per second" },
  "setting-angle": { deg: "Degrees", rad: "Radians" },
  "setting-angle-format": { "0/360": "Positive convention", "-180/180": "Signed convention" },
  "setting-number-format": { Standard: "Default decimal places", "+1 decimal": "One extra decimal place in results" },
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

  setOverlayOpen("modal-options-selector", true);
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
  li.addEventListener("click", () => showContextualHelp(name === "Vs Factor" ? "Vs Factor Output" : name));
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
byId("more-menu").addEventListener("click", (event) => {
  event.stopPropagation();
  vibrateTap();
  setOverlayOpen("main-menu", true);
});
byId("main-menu").addEventListener("click", (event) => {
  if (event.target === byId("main-menu")) setOverlayOpen("main-menu", false);
});
document.addEventListener("click", (event) => {
  const menu = byId("main-menu");
  if (!menu.classList.contains("open")) return;
  const sheet = menu.querySelector(".menu-sheet");
  if (sheet?.contains(event.target as Node) || event.target === byId("more-menu")) return;
  setOverlayOpen("main-menu", false);
});
document.querySelectorAll<HTMLButtonElement>("[data-menu]").forEach((button) => {
  button.addEventListener("click", () => handleMenu(button.dataset.menu ?? ""));
});
byId("feedback-link").addEventListener("click", () => {
  setOverlayOpen("main-menu", false);
});
byId("profile-cancel").addEventListener("click", cancelProfileEditor);
byId("profile-save").addEventListener("click", (event) => {
  event.preventDefault();
  saveProfileFromEditor();
});
byId("profile-delete").addEventListener("click", deleteEditingProfile);
byId("add-flap").addEventListener("click", showNextFlapRow);
byId("remove-flap").addEventListener("click", () => {
  if (visibleFlapRows === 0) return;
  visibleFlapRows -= 1;
  (byId(`profile-flap-${visibleFlapRows}`) as HTMLInputElement).value = "";
  renderFlapRows();
});
for (const [selector, key] of [['label[for="profile-sref"]', "Sref"], ['label[for="profile-cref"]', "cref"], ["#profile-editor .editor-section-head strong", "Weight"], ["#profile-editor .editor-section:last-of-type .editor-section-head strong", "CLmax"]]) {
  const caption = document.querySelector<HTMLElement>(selector);
  if (!caption) continue;
  caption.tabIndex = 0;
  caption.setAttribute("role", "button");
  caption.addEventListener("click", (event) => { event.preventDefault(); showContextualHelp(key); });
  caption.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showContextualHelp(key); }
  });
}
for (const id of ["MTOW", "MLW", "MZFW", "BOW", "Heavy", "Light"]) {
  installTechnicalHold(byId(`profile-weight-${id}`), () => `mass.${id}`);
}
for (let flapIndex = 0; flapIndex < 14; flapIndex += 1) {
  installTechnicalHold(byId(`profile-flap-${flapIndex}`), () => "CLmaxFlap");
}
window.addEventListener("resize", fitEditorChordLabel);
(byId("profile-import") as HTMLInputElement).addEventListener("change", importSelectedFile);
document.querySelectorAll<HTMLButtonElement>("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => (byId(button.dataset.closeDialog ?? "") as HTMLDialogElement).close());
});
byId("settings-cancel").addEventListener("click", () => setOverlayOpen("settings-dialog", false));
byId("settings-dialog").addEventListener("click", (event) => {
  if (event.target === byId("settings-dialog")) setOverlayOpen("settings-dialog", false);
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (byId("settings-dialog").classList.contains("open")) setOverlayOpen("settings-dialog", false);
  if (byId("main-menu").classList.contains("open")) setOverlayOpen("main-menu", false);
});
document.querySelectorAll<HTMLButtonElement>(".setting-choice").forEach((button) => {
  button.addEventListener("click", () => openSettingOptionPicker(
    button.dataset.settingSelect ?? "",
    button.dataset.settingTitle ?? "Select Option",
  ));
});
byId("setting-import-btn")?.addEventListener("click", () => {
  setOverlayOpen("settings-dialog", false);
  (byId("profile-import") as HTMLInputElement).click();
});
byId("setting-export-btn")?.addEventListener("click", () => exportProfileFile());
byId("settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  saveOutputSettings();
});

initializeSwipeNavigation();
["(max-width: 379px)", "(max-width: 359px)", "(max-width: 354px)", "(max-width: 349px)", "(max-width: 339px)", "(max-width: 329px)", "(max-width: 324px)", "(max-width: 319px)", "(max-width: 299px)", "(max-width: 289px)", "(max-width: 269px)", "(max-width: 259px)"].forEach((query) =>
  window.matchMedia(query).addEventListener("change", refreshResponsiveOptionLabels)
);

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
  // When a new worker replaces one controlling this tab, refresh once to load
  // the newly published single-file app. Fresh installations do not reload.
  const hadController = navigator.serviceWorker.controller !== null;
  let reloadedForUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloadedForUpdate) return;
    reloadedForUpdate = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI).toString())
      .then((registration) => {
        void registration.update().catch(() => undefined);
        return navigator.serviceWorker.ready;
      })
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
  installTechnicalHold(label, () => "Aircraft Profile");

  const picker = document.createElement("select");
  picker.id = "airplane-select";
  picker.className = "profile-select airplane-select-native";
  picker.setAttribute("aria-label", "Airplane profile");
  picker.hidden = true;

  const pickerButton = document.createElement("button");
  pickerButton.type = "button";
  pickerButton.id = "airplane-select-button";
  pickerButton.className = "profile-select airplane-select-button";
  pickerButton.setAttribute("aria-haspopup", "dialog");
  pickerButton.setAttribute("aria-label", "Select airplane profile");
  setHelper(pickerButton, "Select a stored aircraft profile. Its reference geometry, named weights and flap maximum-lift-coefficient values become available in Inputs.");
  pickerButton.addEventListener("click", () => {
    vibrateTap();
    openAirplaneProfilePicker();
  });
  pickerButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      vibrateTap();
      openAirplaneProfilePicker();
    }
  });
  installTechnicalHold(pickerButton, () => "Aircraft Profile");

  row.append(label, picker, pickerButton);
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
  let downX = 0;
  let downY = 0;
  wrap.addEventListener("pointerdown", (event) => {
    held = false;
    downX = event.clientX;
    downY = event.clientY;
    timer = window.setTimeout(() => {
      held = true;
      showContextualHelp(type.value);
    }, 550);
  });
  wrap.addEventListener("pointermove", (event) => {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 10) window.clearTimeout(timer);
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
  value.placeholder = "";
  value.value = field.defaultValue ?? "";
  value.setAttribute("aria-label", `${field.typeOptions.find((item) => item.value === field.defaultType)?.label ?? field.id} value`);
  setHelper(value, helperFor(field.id, field.defaultType));
  installTechnicalHold(value, () => type.value);

  const unit = document.createElement("select");
  unit.id = `${field.id}-unit`;
  unit.className = "unit-select calc-control";
  unit.setAttribute("aria-label", `${field.id} unit`);
  fillSelect(unit, field.unitOptions, field.defaultUnit);
  setHelper(unit, "Unit used for this input value. Changing the unit converts the current numeric value when applicable.");
  // The select remains the source of truth for calculations and unit conversion.
  // A real button receives clicks/taps instead: native <select> pointer events
  // can suppress pointerup/click when their default popup behavior is prevented.
  unit.tabIndex = -1;
  unit.setAttribute("aria-hidden", "true");
  const unitTrigger = document.createElement("button");
  unitTrigger.type = "button";
  unitTrigger.id = `${field.id}-unit-trigger`;
  unitTrigger.className = "unit-select-trigger";
  unitTrigger.setAttribute("aria-label", `${field.id} unit options`);
  unitTrigger.setAttribute("aria-haspopup", "dialog");
  unitTrigger.setAttribute("aria-controls", "modal-options-selector");
  setHelper(unitTrigger, "Select a unit for this input. Press and hold for technical help.");
  unitTrigger.addEventListener("click", () => {
    vibrateTap();
    openInputUnitPicker(field.id);
  });
  installTechnicalHold(unitTrigger, () => type.value);

  const tail = document.createElement("div");
  tail.className = "input-tail";
  tail.append(unit, unitTrigger);

  if (field.id === "spd") {
    const deltaLabel = document.createElement("button");
    deltaLabel.type = "button";
    deltaLabel.id = "spdDelta-label";
    deltaLabel.className = "speed-delta-label";
    deltaLabel.textContent = "+Δ";
    deltaLabel.setAttribute("aria-label", "Delta speed relative to stall-speed factor");
    setHelper(deltaLabel, "Additional calibrated speed added after applying the stall-speed factor. This Δ term is always entered in knots.");
    deltaLabel.hidden = true;

    const delta = document.createElement("input");
    delta.id = "spdDelta-value";
    delta.className = "value-input calc-control speed-delta";
    delta.inputMode = "decimal";
    delta.autocomplete = "off";
    delta.placeholder = "";
    delta.value = "";
    delta.hidden = true;
    delta.setAttribute("aria-label", "Stall-speed-factor delta in knots");
    setHelper(delta, "Additional calibrated speed in knots added after multiplying the 1-g stall speed by the selected factor.");
    deltaLabel.addEventListener("click", () => {
      vibrateTap();
      delta.focus();
    });

    row.append(wrap, value, tail, deltaLabel, delta);
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
  let movedHorizontally = false;
  let suppressClickUntil = 0;

  shell.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || document.querySelector("dialog[open], .modal-overlay.open")) return;
    // Each new gesture may be a genuine tap, even immediately after a swipe.
    suppressClickUntil = 0;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = performance.now();
    movedHorizontally = false;
    tracking = true;
  });

  shell.addEventListener("pointermove", (event) => {
    if (!tracking || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      movedHorizontally = true;
      suppressClickUntil = performance.now() + 550;
    }
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.2) event.preventDefault();
  }, { passive: false });

  // Some mobile browsers dispatch a click after pointerup, even if a swipe
  // navigated to another tab. Intercept it before input/select handlers.
  shell.addEventListener("click", (event) => {
    if (performance.now() > suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClickUntil = 0;
  }, true);

  const finish = (event: PointerEvent): void => {
    if (!tracking || event.pointerId !== pointerId) return;
    tracking = false;
    pointerId = null;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const elapsed = performance.now() - startTime;
    if (movedHorizontally) suppressClickUntil = performance.now() + 550;
    if (elapsed > 900 || Math.abs(dx) < 55 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;

    const current = currentPageName();
    const index = PAGE_ORDER.indexOf(current);
    const nextIndex = dx > 0 ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= PAGE_ORDER.length) return;

    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setOverlayOpen("main-menu", false);
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
  // Same width policy as Android. The 39% selector column keeps full labels
  // on regular phones; only the longest labels shorten below 380 px.
  const width = window.innerWidth;
  const under380 = width < 380;
  const under340 = width < 340;
  const under320 = width < 320;
  const under300 = width < 300;
  const under290 = width < 290;
  const under260 = width < 260;

  if (value === "Hp") return label;
  if (value === "Hg") return width < 325 ? "H<sub>GEOM</sub>" : label;
  if (value === "P") return under300 ? "p" : under380 ? "Pressure" : label;
  if (value === "OAT") return under340 ? "OAT" : under380 ? "Temperature" : label;

  if (value === "TAS") return under290 ? "TAS" : label;
  if (value === "CAS") return under290 ? "CAS" : label;
  if (value === "EAS") return under290 ? "EAS" : label;
  if (value === "CL") return "C<sub>L</sub>";

  if (value === "Sref") return label;
  if (value === "cref") return under260 ? "c<sub>REF</sub>" : label;
  if (value === "CLmax") return "C<sub>L,MAX</sub>";
  if (value.startsWith("Flap ")) {
    const flapNum = value.slice(5);
    return under340 ? `C<sub>L,MAX</sub> F${flapNum}` : `Flap ${flapNum} - C<sub>L,MAX</sub>`;
  }

  if (value === "Track") return under260 ? "Track" : label;
  if (value === "Heading") return under300 ? "Heading" : label;
  if (value === "Sideslip") return under300 ? "Sideslip" : label;
  if (value === "Drift") return label;
  if (value === "Runway Angle") return under320 ? "Rnwy Angle" : label;

  if (value === "HeadWind") return under300 ? "HeadWnd" : "Headwind";
  if (value === "CrossWind") return under300 ? "CrossWnd" : "Crosswind";
  if (value === "Wind Speed") return under300 ? "WindSpd" : width < 360 ? "Wind Spd" : "Wind Speed";
  if (value === "Wind Direction") return under300 ? "WindDir" : width < 360 ? "Wind Dir" : "Wind Direction";

  if (value === "Vs Factor") return label;
  if (value === "Ground Speed") return width < 360 ? "Grnd Spd" : label;
  if (value === "Qdyn") return under300 ? "q" : under380 ? "Dyn Press" : label;
  if (value === "Qc") return under300 ? "q<sub>c</sub>" : under380 ? "Imp Press" : label;
  if (value === "NzPullup") return under260 ? "N<sub>Z</sub>" : label;
  if (value === "NzTurn") return under260 ? "N<sub>Z</sub>" : label;
  if (value === "BankTurn") return under260 ? "Bank" : label;
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
    selectButton.innerHTML = `<span class="airplane-name-line"><strong>${escapeHtml(displayName)}</strong>${activeBadge}</span><span class="airplane-meta">${escapeHtml(airplaneMetaSubtitle(profile))}</span>`;
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
  renderAirplaneSelector();
  applyProfileSelection(duplicate.id, false);
  renderProfiles();
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

function airplaneMetaSubtitle(profile: AircraftProfile): string {
  const primaryWeight = profile.weights?.MTOW ?? Object.values(profile.weights ?? {})[0];
  const secondary = primaryWeight != null
    ? `${primaryWeight} ${profile.weightUnit}`
    : (profile.cref ? `${profile.cref} ${profile.crefUnit}` : "");
  return secondary
    ? `${profile.sref} ${profile.srefUnit} · ${secondary}`
    : `${profile.sref} ${profile.srefUnit}`;
}

function openAirplaneProfilePicker(): void {
  const modal = byId("modal-options-selector");
  const titleEl = byId("options-selector-title");
  const listEl = byId("options-selector-list");
  if (!modal || !titleEl || !listEl) return;

  titleEl.textContent = "Airplane";
  listEl.innerHTML = "";

  const options = [
    { id: "custom", name: "Custom Airplane", desc: "Manual geometry, mass and aerodynamic inputs" },
    ...profiles.map((profile) => ({
      id: profile.id,
      name: profile.name || "Unnamed Airplane",
      desc: airplaneMetaSubtitle(profile),
    })),
  ];

  for (const option of options) {
    const itemEl = document.createElement("div");
    itemEl.className = `option-item${option.id === selectedProfileId ? " selected" : ""}`;
    itemEl.tabIndex = 0;
    itemEl.setAttribute("role", "button");

    const textGroup = document.createElement("div");
    textGroup.className = "option-text-group";

    const labelEl = document.createElement("div");
    labelEl.className = "option-label";
    labelEl.textContent = option.name;
    textGroup.appendChild(labelEl);

    const descEl = document.createElement("div");
    descEl.className = "option-desc";
    descEl.textContent = option.desc;
    textGroup.appendChild(descEl);

    const radio = document.createElement("div");
    radio.className = "option-radio";
    const radioInner = document.createElement("div");
    radioInner.className = "option-radio-inner";
    radio.appendChild(radioInner);

    itemEl.append(textGroup, radio);

    const choose = () => {
      vibrateTap();
      applyProfileSelection(option.id);
      closeOptionsModal();
    };
    itemEl.addEventListener("click", choose);
    itemEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose();
      }
    });
    listEl.appendChild(itemEl);
  }

  modal.classList.add("open");
}

function renderAirplaneSelector(): void {
  const picker = byId("airplane-select") as HTMLSelectElement;
  const options: SelectOption[] = [
    { value: "custom", label: "Custom Airplane" },
    ...profiles.map((profile) => ({ value: profile.id, label: profile.name || "Unnamed Airplane" })),
  ];
  if (selectedProfileId !== "custom" && !profiles.some((p) => p.id === selectedProfileId)) selectedProfileId = "custom";
  fillSelect(picker, options, selectedProfileId);
  const button = document.getElementById("airplane-select-button") as HTMLButtonElement | null;
  if (button) button.textContent = picker.selectedOptions[0]?.textContent ?? "Custom Airplane";
}

function selectedProfile(): AircraftProfile | undefined {
  return profiles.find((profile) => profile.id === selectedProfileId);
}

function applyProfileSelection(id: string, recalc = true): void {
  const previousProfileId = selectedProfileId;
  selectedProfileId = profiles.some((p) => p.id === id) ? id : "custom";
  localStorage.setItem(SELECTED_PROFILE_KEY, selectedProfileId);
  const picker = document.getElementById("airplane-select") as HTMLSelectElement | null;
  if (picker) picker.value = selectedProfileId;
  const pickerButton = document.getElementById("airplane-select-button") as HTMLButtonElement | null;
  if (pickerButton) {
    const selected = selectedProfile();
    pickerButton.textContent = selected?.name || "Custom Airplane";
  }

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
    // A newly selected profile starts from its first stored weight and flap, so the
    // calculation never silently falls back to the 1 kg / CL,MAX = 1 defaults.
    if (selectedProfileId !== previousProfileId) {
      if (weightOptions.length > 1) weightSelect.value = weightOptions[1];
      if (flapOptions.length > 1) clSelect.value = flapOptions[1];
      updateTypeSelectDisplay(weightSelect);
      updateTypeSelectDisplay(clSelect);
      applyProfileNamedValue();
    }
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
  fitEditorChordLabel();
  for (const id of ["sref", "cref", "weight"]) {
    const selector = byId(`profile-${id}-unit`) as HTMLSelectElement;
    selector.dataset.previousValue = selector.value;
  }
  editorSnapshot = editorState();
}

// Convert only populated numeric fields and preserve the underlying physical
// quantity when an editor unit is changed. Empty fields stay empty.
function convertProfileEditorUnit(
  selectorId: string,
  fieldsToConvert: string[],
  factorToBase: (value: number, unit: string) => number
): void {
  const unit = byId(selectorId) as HTMLSelectElement;
  const oldUnit = unit.dataset.previousValue ?? unit.value;
  const newUnit = unit.value;
  unit.dataset.previousValue = newUnit;
  if (oldUnit === newUnit) return;
  const ratio = factorToBase(1, oldUnit) / factorToBase(1, newUnit);
  for (const id of fieldsToConvert) {
    const field = byId(id) as HTMLInputElement;
    const raw = field.value.trim();
    if (!raw) continue;
    const original = Number(raw.replace(",", "."));
    if (!Number.isFinite(original)) continue;
    const converted = original * ratio;
    if (Number.isFinite(converted)) field.value = String(Number(converted.toPrecision(12)));
  }
}
for (const [unitId, values, conversion] of [
  ["profile-sref-unit", ["profile-sref"], units.areaToM2],
  ["profile-cref-unit", ["profile-cref"], lengthAnyToM],
  ["profile-weight-unit", WEIGHT_KEYS.map((key) => `profile-weight-${key}`), units.massToKg],
] as const) {
  byId(unitId).addEventListener("change", () => convertProfileEditorUnit(unitId, [...values], conversion));
}

// Values of every editor field; Cancel asks before discarding only when this changed.
function editorState(): string {
  return Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("#profile-editor input, #profile-editor select"))
    .map((el) => el.value)
    .join("|");
}

function cancelProfileEditor(): void {
  if (editorState() !== editorSnapshot && !window.confirm("Discard changes?")) return;
  closeProfileEditor();
}

function fitEditorChordLabel(): void {
  const label = document.querySelector<HTMLElement>('label[for="profile-cref"]');
  if (!label) return;
  label.innerHTML = "Chord c<sub>REF</sub>";
  if (label.clientWidth > 0 && label.scrollWidth > label.clientWidth + 1) label.innerHTML = "c<sub>REF</sub>";
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
  (byId("remove-flap") as HTMLButtonElement).disabled = visibleFlapRows === 0;
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
  renderAirplaneSelector();
  applyProfileSelection(profile.id, false);
  renderProfiles();
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
  setOverlayOpen("main-menu", false);
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
  // A stored "null" or non-object value must not break startup.
  if (!state || typeof state !== "object") return;

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
  (byId("setting-number-format") as HTMLSelectElement).value = settings.extraDecimal ? "+1 decimal" : "Standard";
  syncSettingChoiceButtons();
  setOverlayOpen("settings-dialog", true);
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
    extraDecimal: (byId("setting-number-format") as HTMLSelectElement).value === "+1 decimal",
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyTheme();
  setOverlayOpen("settings-dialog", false);
  recalculate();
}

function applyTheme(): void {
  document.documentElement.dataset.theme = settings.theme;
  const style = getComputedStyle(document.documentElement);
  for (const [name, color] of [["selector-chevron", "--button-text"], ["profile-chevron", "--field-text"]]) {
    const fill = style.getPropertyValue(color).trim();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3" viewBox="0 0 4 3" preserveAspectRatio="none"><path d="M0 0h4L2 3z" fill="${fill}"/></svg>`;
    document.documentElement.style.setProperty(`--${name}`, `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  }
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
    const decimals = fieldId === "sref" && (newUnit === "in²" || window.innerWidth < 300) ? 3 : 6;
    input.value = formatEditableNumber(converted, decimals);
  }
}

function temperatureFromK(kelvin: number, unit: string): number {
  if (unit === "°C") return kelvin - 273.15;
  if (unit === "°F") return (kelvin - 273.15) * 9 / 5 + 32;
  return kelvin;
}

function formatEditableNumber(value: number, maxDecimals = 6): string {
  const scale = 10 ** maxDecimals;
  const rounded = Math.round(value * scale) / scale;
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
    speedInput.placeholder = "";
  } else {
    speedUnit.hidden = false;
    speedDelta.hidden = true;
    speedInput.placeholder = "";
    if (speedType === "Mach" || speedType === "CL") {
      // Keep the third control visible for dimensionless quantities.
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

  // Match the clickable proxy to the actual unit options after every
  // quantity change (e.g. Mach/CL are dimensionless; TAS has selectable units).
  for (const field of fields) {
    const unitSelect = select(`${field.id}-unit`);
    const trigger = byId(`${field.id}-unit-trigger`) as HTMLButtonElement;
    const dimensionless = unitSelect.options.length === 1
      && ["—", "-"].includes(unitSelect.options[0].value);
    unitSelect.disabled = dimensionless;
    trigger.disabled = dimensionless;
    unitSelect.style.opacity = dimensionless ? "0.7" : "";
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
      "Viscosity": `${fmt(mu * 1e5, 3)}×10⁻⁵ Pa·s`,
      "Sound Speed": formatSpeed(atmosphere.speedOfSoundMS),
      "True Airspeed": formatSpeed(tas),
      "Calibrated Airspeed": formatSpeed(cas),
      "Equivalent Airspeed": formatSpeed(eas),
      "Ground Speed": formatSpeed(windSolution.groundSpeedMS),
      "Stall Speed Vs": formatSpeed(vsCas),
      "Vs Factor": fmt(vsFactor, 3),
      "Lift Coefficient CL": fmt(cl, 3),
      "Mach": fmt(mach, 3),
      "Reynolds": `${fmt(reynolds / 1e6, 2)}×10⁶`,
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
      // UI-1: direction is undefined without wind.
      "Wind Direction": windSolution.windSpeedMS < 1e-9 ? "----" : angleText(windSolution.windDirectionRad),
      "AlongTrack Headwind": formatSpeed(windSolution.alongTrackHeadwindMS),
      "AlongTrack Crosswind": formatSpeed(windSolution.alongTrackCrosswindMS),
    };

    renderResults(outputs);
    setStatus(
      `Valid solution · H_P = ${fmt(pressureAltitudeM, 1)} m · M = ${fmt(mach, 3)} · GS = ${fmt(windSolution.groundSpeedMS / (1852 / 3600), 1)} kt`,
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
