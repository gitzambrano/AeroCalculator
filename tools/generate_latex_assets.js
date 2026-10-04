const fs = require('fs');
const path = require('path');
const katex = require(path.join(__dirname, '..', 'web', 'node_modules', 'katex'));

// Canonical LaTeX equations for all AeroCalculator variables
const LATEX_EQUATIONS = {
  // Atmosphere & Altitudes
  "Hp": "p_{\\mathrm{ISA}}(H_p) = p",
  "Pressure Altitude": "p_{\\mathrm{ISA}}(H_p) = p",
  "Hg": "h = \\frac{r_0 \\, H}{r_0 - H}",
  "Geometric Altitude": "h = \\frac{r_0 \\, H}{r_0 - H}",
  "Geopotencial Altitude": "H = \\frac{r_0 \\, h}{r_0 + h}",
  "Density Altitude": "\\rho_{\\mathrm{ISA}}(H_\\rho) = \\rho",
  "Temperature Altitude": "T_{\\mathrm{ISA}}(H_T) = T",
  "P": "p = \\rho \\, R \\, T",
  "Pressure": "p = \\rho \\, R \\, T",
  "Δ ISA": "\\Delta T = T - T_{\\mathrm{ISA}}(H_p)",
  "Delta ISA": "\\Delta T = T - T_{\\mathrm{ISA}}(H_p)",
  "OAT": "T = T_{\\mathrm{ISA}}(H_p) + \\Delta T",
  "Temperature": "T = T_{\\mathrm{ISA}}(H_p) + \\Delta T",
  "Total Temperature": "T_t = T \\left( 1 + \\frac{\\gamma - 1}{2} M^2 \\right)",
  "Density": "\\rho = \\frac{p}{R \\, T}",
  "Viscosity": "\\mu = \\mu_0 \\, \\frac{T_0 + C}{T + C} \\left( \\frac{T}{T_0} \\right)^{3/2}",
  "Sound Speed": "a = \\sqrt{\\gamma \\, R \\, T}",

  // Airspeeds & Aerodynamics
  "TAS": "\\mathrm{TAS} = M \\cdot a",
  "True Airspeed": "\\mathrm{TAS} = M \\cdot a",
  "CAS": "\\mathrm{CAS} = a_0 \\sqrt{\\frac{2}{\\gamma - 1} \\left[ \\left( \\frac{q_c}{p_0} + 1 \\right)^{\\frac{\\gamma - 1}{\\gamma}} - 1 \\right]}",
  "Calibrated Airspeed": "\\mathrm{CAS} = a_0 \\sqrt{\\frac{2}{\\gamma - 1} \\left[ \\left( \\frac{q_c}{p_0} + 1 \\right)^{\\frac{\\gamma - 1}{\\gamma}} - 1 \\right]}",
  "EAS": "\\mathrm{EAS} = \\mathrm{TAS} \\sqrt{\\frac{\\rho}{\\rho_0}}",
  "Equivalent Airspeed": "\\mathrm{EAS} = \\mathrm{TAS} \\sqrt{\\frac{\\rho}{\\rho_0}}",
  "Mach": "M = \\frac{\\mathrm{TAS}}{a}",
  "CL": "C_L = \\frac{n \\cdot m \\cdot g_0}{q \\cdot S_{\\mathrm{ref}}}",
  "Lift Coefficient CL": "C_L = \\frac{n \\cdot m \\cdot g_0}{q \\cdot S_{\\mathrm{ref}}}",
  "Vs Factor": "\\mathrm{CAS} = \\mathrm{factor} \\times V_{s,\\mathrm{CAS}} + \\Delta \\mathrm{CAS}",
  "Ground Speed": "V_{\\mathrm{ground}} = V_{\\mathrm{air}} + V_{\\mathrm{wind}}",
  "Stall Speed Vs": "V_{s,\\mathrm{TAS}} = \\sqrt{\\frac{2 \\, m \\, g_0}{\\rho \\, S_{\\mathrm{ref}} \\, C_{L,\\max}}}",
  "Qdyn": "q = \\frac{1}{2} \\rho \\, \\mathrm{TAS}^2",
  "Dynamic Pressure": "q = \\frac{1}{2} \\rho \\, \\mathrm{TAS}^2",
  "Qc": "q_c = p \\left[ \\left( 1 + \\frac{\\gamma - 1}{2} M^2 \\right)^{\\frac{\\gamma}{\\gamma - 1}} - 1 \\right]",
  "Impact Pressure": "q_c = p \\left[ \\left( 1 + \\frac{\\gamma - 1}{2} M^2 \\right)^{\\frac{\\gamma}{\\gamma - 1}} - 1 \\right]",
  "Total Pressure": "p_t = p + q_c",
  "Reynolds": "\\mathrm{Re} = \\frac{\\rho \\, \\mathrm{TAS} \\, c_{\\mathrm{ref}}}{\\mu}",

  // Non-dimensional ratios
  "Pressure Ratio δ": "\\delta = \\frac{p}{p_0}",
  "Density Ratio σ": "\\sigma = \\frac{\\rho}{\\rho_0}",
  "Temperature Ratio θ": "\\theta = \\frac{T}{T_0}",

  // Forces & Geometry
  "Weight": "W = m \\cdot g_0",
  "Sref": "L = q \\, S_{\\mathrm{ref}} \\, C_L",
  "cref": "\\mathrm{Re} = \\frac{\\rho \\, \\mathrm{TAS} \\, c_{\\mathrm{ref}}}{\\mu}",
  "CLmax": "V_{s,\\mathrm{TAS}} = \\sqrt{\\frac{2 \\, m \\, g_0}{\\rho \\, S_{\\mathrm{ref}} \\, C_{L,\\max}}}",
  "CLmaxFlap": "V_{s,\\mathrm{TAS}} = \\sqrt{\\frac{2 \\, m \\, g_0}{\\rho \\, S_{\\mathrm{ref}} \\, C_{L,\\max}}}",
  "DynPressure * S / g": "\\frac{q \\cdot S_{\\mathrm{ref}}}{g_0}",
  "Lift Force": "\\frac{L}{g_0} = \\frac{q \\cdot S_{\\mathrm{ref}} \\cdot C_L}{g_0} = n \\cdot m",
  "Weight/Delta W/δ": "\\frac{W}{\\delta \\cdot g_0} = \\frac{m}{\\delta}",

  // Maneuvers
  "NzPullup": "L = n \\cdot m \\cdot g_0",
  "NzTurn": "n = \\frac{1}{\\cos \\varphi}",
  "BankTurn": "n = \\frac{1}{\\cos \\varphi}",
  "Load Factor Nz": "n = \\frac{L}{W} = \\frac{1}{\\cos \\varphi}",
  "Bank Angle φ": "n = \\frac{1}{\\cos \\varphi}",
  "Turn Radius": "r = \\frac{\\mathrm{TAS}^2}{g_0 \\tan \\varphi}",
  "Turn Rate": "\\omega = \\frac{g_0 \\tan \\varphi}{\\mathrm{TAS}}",

  // Navigation & Wind
  "Track": "\\vec{V}_{\\mathrm{ground}} = \\vec{V}_{\\mathrm{air}} + \\vec{V}_{\\mathrm{wind}}",
  "Track Angle": "\\vec{V}_{\\mathrm{ground}} = \\vec{V}_{\\mathrm{air}} + \\vec{V}_{\\mathrm{wind}}",
  "Heading": "\\psi = \\text{aircraft heading}",
  "Heading Angle Ψ": "\\psi = \\text{aircraft heading}",
  "Sideslip": "\\beta = \\text{sideslip angle}",
  "Sideslip Angle β": "\\beta = \\text{sideslip angle}",
  "Drift": "\\mathrm{drift} = \\psi - \\chi",
  "Drift Angle": "\\mathrm{drift} = \\psi - \\chi",
  "HeadWind": "\\mathrm{HW} = V_w \\cos(\\psi_w - \\psi_{\\mathrm{RWY}})",
  "CrossWind": "\\mathrm{CW} = V_w \\sin(\\psi_w - \\psi_{\\mathrm{RWY}})",
  "AlongTrack Headwind": "\\mathrm{HW}_\\chi = V_w \\cos(\\psi_w - \\chi)",
  "AlongTrack Crosswind": "\\mathrm{CW}_\\chi = V_w \\sin(\\psi_w - \\chi)",
  "Wind Speed": "V_w = \\sqrt{\\mathrm{HW}^2 + \\mathrm{CW}^2}",
  "Runway Angle": "\\psi_{\\mathrm{RWY}} = \\text{runway heading}",
  "Wind Direction": "\\psi_w = \\text{meteorological wind direction}",

  // Aircraft mass presets
  "mass.MTOW": "W = m \\cdot g_0",
  "mass.MLW": "W = m \\cdot g_0",
  "mass.MZFW": "W = m \\cdot g_0",
  "mass.BOW": "W = m \\cdot g_0",
  "mass.Heavy": "W = m \\cdot g_0",
  "mass.Light": "W = m \\cdot g_0",
};

function toSafeKey(raw) {
  return raw
    .replace(/Δ/g, 'Delta')
    .replace(/δ/g, 'delta')
    .replace(/σ/g, 'sigma')
    .replace(/θ/g, 'theta')
    .replace(/φ/g, 'phi')
    .replace(/Ψ/g, 'psi')
    .replace(/β/g, 'beta')
    .replace(/ρ/g, 'rho')
    .replace(/μ/g, 'mu')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

const KATEX_CSS = fs.readFileSync(path.join(__dirname, '..', 'Files', 'katex', 'katex.min.css'), 'utf8');

function buildHtml(latex) {
  const rendered = katex.renderToString(latex, {
    displayMode: true,
    throwOnError: false,
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
${KATEX_CSS}
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-user-select: none;
  user-select: none;
  box-sizing: border-box;
  color: #009183;
  font-size: 16px;
}
.katex-wrap {
  margin: auto;
  padding: 2px 14px;
  white-space: nowrap;
}
.katex-display { margin: 0 !important; }
.katex { font-size: 1.08em; }
</style>
</head>
<body>
<div class="katex-wrap">
${rendered}
</div>
</body>
</html>`;
}

function main() {
  const outDir = path.join(__dirname, '..', 'Files', 'katex', 'eq');
  fs.mkdirSync(outDir, { recursive: true });

  const map = {};
  for (const [key, latex] of Object.entries(LATEX_EQUATIONS)) {
    const safe = toSafeKey(key);
    map[key] = safe;
    const html = buildHtml(latex);
    fs.writeFileSync(path.join(outDir, `${safe}.html`), html, 'utf8');
    fs.writeFileSync(path.join(outDir, `${safe.toLowerCase()}.html`), html, 'utf8');
  }

  // Write index mapping for debugging and verification
  fs.writeFileSync(
    path.join(__dirname, '..', 'Files', 'katex', 'map.json'),
    JSON.stringify(map, null, 2),
    'utf8'
  );

  console.log(`Generated ${Object.keys(map).length} KaTeX pre-rendered equations in Files/katex/eq/ (both canonical and lowercase)`);
}

main();
