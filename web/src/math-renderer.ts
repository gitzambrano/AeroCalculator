import katex from "katex";
import "katex/dist/katex.min.css";

// Canonical LaTeX equations for AeroCalculator nomenclature
export const KEY_EQUATIONS_LATEX: Record<string, string> = {
  // Atmosphere & Altitudes
  "Hp": "p_{\\mathrm{ISA}}(H_p) = p",
  "Pressure Altitude": "p_{\\mathrm{ISA}}(H_p) = p",
  "Hg": "h = \\frac{r_0 \\, H}{r_0 - H}, \\quad H = \\frac{r_0 \\, h}{r_0 + h}",
  "Hgeom": "h = \\frac{r_0 \\, H}{r_0 - H}, \\quad H = \\frac{r_0 \\, h}{r_0 + h}",
  "Geometric Altitude": "h = \\frac{r_0 \\, H}{r_0 - H}",
  "Geopotential Altitude": "H = \\frac{r_0 \\, h}{r_0 + h}",
  "Hgeop": "H = \\frac{r_0 \\, h}{r_0 + h}",
  "H": "H = \\frac{r_0 \\, h}{r_0 + h}",
  "Density Altitude": "\\rho_{\\mathrm{ISA}}(H_\\rho) = \\rho",
  "Hρ": "\\rho_{\\mathrm{ISA}}(H_\\rho) = \\rho",
  "Temperature Altitude": "T_{\\mathrm{ISA}}(H_T) = T",
  "HT": "T_{\\mathrm{ISA}}(H_T) = T",
  "P": "p = \\rho \\, R \\, T",
  "Pressure": "p = \\rho \\, R \\, T",
  "Δ ISA": "\\Delta T = T - T_{\\mathrm{ISA}}(H_p)",
  "Delta ISA": "\\Delta T = T - T_{\\mathrm{ISA}}(H_p)",
  "OAT": "T = T_{\\mathrm{ISA}}(H_p) + \\Delta T",
  "Temperature": "T = T_{\\mathrm{ISA}}(H_p) + \\Delta T",
  "Total Temperature": "T_t = T \\left( 1 + \\frac{\\gamma - 1}{2} M^2 \\right)",
  "Tt": "T_t = T \\left( 1 + \\frac{\\gamma - 1}{2} M^2 \\right)",
  "Density": "\\rho = \\frac{p}{R \\, T}",
  "ρ": "\\rho = \\frac{p}{R \\, T}",
  "Viscosity": "\\mu = \\mu_0 \\, \\frac{T_0 + C}{T + C} \\left( \\frac{T}{T_0} \\right)^{3/2}",
  "μ": "\\mu = \\mu_0 \\, \\frac{T_0 + C}{T + C} \\left( \\frac{T}{T_0} \\right)^{3/2}",
  "Sound Speed": "a = \\sqrt{\\gamma \\, R \\, T}",
  "a": "a = \\sqrt{\\gamma \\, R \\, T}",

  // Airspeeds & Aerodynamics
  "TAS": "\\mathrm{TAS} = M \\cdot a",
  "True Airspeed": "\\mathrm{TAS} = M \\cdot a",
  "CAS": "\\mathrm{CAS} = a_0 \\sqrt{\\frac{2}{\\gamma - 1} \\left[ \\left( \\frac{q_c}{p_0} + 1 \\right)^{\\frac{\\gamma - 1}{\\gamma}} - 1 \\right]}",
  "Calibrated Airspeed": "\\mathrm{CAS} = a_0 \\sqrt{\\frac{2}{\\gamma - 1} \\left[ \\left( \\frac{q_c}{p_0} + 1 \\right)^{\\frac{\\gamma - 1}{\\gamma}} - 1 \\right]}",
  "EAS": "\\mathrm{EAS} = \\mathrm{TAS} \\sqrt{\\frac{\\rho}{\\rho_0}}",
  "Equivalent Airspeed": "\\mathrm{EAS} = \\mathrm{TAS} \\sqrt{\\frac{\\rho}{\\rho_0}}",
  "Mach": "M = \\frac{\\mathrm{TAS}}{a}",
  "M": "M = \\frac{\\mathrm{TAS}}{a}",
  "CL": "C_L = \\frac{n \\cdot m \\cdot g_0}{q \\cdot S_{\\mathrm{ref}}}",
  "Lift Coefficient CL": "C_L = \\frac{n \\cdot m \\cdot g_0}{q \\cdot S_{\\mathrm{ref}}}",
  "Vs Factor": "\\mathrm{CAS} = \\mathrm{factor} \\times V_{s,\\mathrm{CAS}} + \\Delta \\mathrm{CAS}",
  "Stall Speed Vs": "V_{s,\\mathrm{TAS}} = \\sqrt{\\frac{2 \\, m \\, g_0}{\\rho \\, S_{\\mathrm{ref}} \\, C_{L,\\max}}}",
  "Vs": "V_{s,\\mathrm{TAS}} = \\sqrt{\\frac{2 \\, m \\, g_0}{\\rho \\, S_{\\mathrm{ref}} \\, C_{L,\\max}}}",
  "CLmax": "V_{s,\\mathrm{TAS}} = \\sqrt{\\frac{2 \\, m \\, g_0}{\\rho \\, S_{\\mathrm{ref}} \\, C_{L,\\max}}}",
  "Reynolds": "\\mathrm{Re} = \\frac{\\rho \\, \\mathrm{TAS} \\, c_{\\mathrm{ref}}}{\\mu}",
  "Re": "\\mathrm{Re} = \\frac{\\rho \\, \\mathrm{TAS} \\, c_{\\mathrm{ref}}}{\\mu}",
  "Qdyn": "q = \\frac{1}{2} \\rho \\, \\mathrm{TAS}^2",
  "Dynamic Pressure": "q = \\frac{1}{2} \\rho \\, \\mathrm{TAS}^2",
  "Qc": "q_c = p \\left[ \\left( 1 + \\frac{\\gamma - 1}{2} M^2 \\right)^{\\frac{\\gamma}{\\gamma - 1}} - 1 \\right]",
  "Impact Pressure": "q_c = p \\left[ \\left( 1 + \\frac{\\gamma - 1}{2} M^2 \\right)^{\\frac{\\gamma}{\\gamma - 1}} - 1 \\right]",
  "Total Pressure": "p_t = p + q_c",
  "pt": "p_t = p + q_c",

  // Non-dimensional ratios
  "Pressure Ratio δ": "\\delta = \\frac{p}{p_0}",
  "δ": "\\delta = \\frac{p}{p_0}",
  "Density Ratio σ": "\\sigma = \\frac{\\rho}{\\rho_0}",
  "σ": "\\sigma = \\frac{\\rho}{\\rho_0}",
  "Temperature Ratio θ": "\\theta = \\frac{T}{T_0}",
  "θ": "\\theta = \\frac{T}{T_0}",

  // Forces & Geometry
  "Weight": "W = m \\cdot g_0",
  "Sref": "L = q \\, S_{\\mathrm{ref}} \\, C_L",
  "cref": "\\mathrm{Re} = \\frac{\\rho \\, \\mathrm{TAS} \\, c_{\\mathrm{ref}}}{\\mu}",
  "DynPressure * S / g": "\\frac{q \\cdot S_{\\mathrm{ref}}}{g_0}",
  "qS/g0": "\\frac{q \\cdot S_{\\mathrm{ref}}}{g_0}",
  "Lift Force": "\\frac{L}{g_0} = \\frac{q \\cdot S_{\\mathrm{ref}} \\cdot C_L}{g_0} = n \\cdot m",
  "L": "\\frac{L}{g_0} = \\frac{q \\cdot S_{\\mathrm{ref}} \\cdot C_L}{g_0}",
  "Weight/Delta W/δ": "\\frac{W}{\\delta \\cdot g_0} = \\frac{m}{\\delta}",
  "W/δ": "\\frac{W}{\\delta \\cdot g_0} = \\frac{m}{\\delta}",

  // Maneuvers & Flight Mechanics
  "NzPullup": "L = n \\cdot m \\cdot g_0",
  "NzTurn": "n = \\frac{1}{\\cos \\varphi}",
  "BankTurn": "n = \\frac{1}{\\cos \\varphi}",
  "Load Factor Nz": "n = \\frac{L}{W} = \\frac{1}{\\cos \\varphi}",
  "Bank Angle φ": "n = \\frac{1}{\\cos \\varphi}",
  "Turn Radius": "r = \\frac{\\mathrm{TAS}^2}{g_0 \\tan \\varphi}",
  "r": "r = \\frac{\\mathrm{TAS}^2}{g_0 \\tan \\varphi}",
  "Turn Rate": "\\omega = \\frac{g_0 \\tan \\varphi}{\\mathrm{TAS}}",
  "ω": "\\omega = \\frac{g_0 \\tan \\varphi}{\\mathrm{TAS}}",

  // Navigation & Wind
  "Track": "\\vec{V}_{\\mathrm{ground}} = \\vec{V}_{\\mathrm{air}} + \\vec{V}_{\\mathrm{wind}}",
  "Track Angle": "\\vec{V}_{\\mathrm{ground}} = \\vec{V}_{\\mathrm{air}} + \\vec{V}_{\\mathrm{wind}}",
  "Heading": "\\psi = \\text{aircraft heading}",
  "Heading Angle Ψ": "\\psi = \\text{aircraft heading}",
  "Drift": "\\mathrm{drift} = \\psi - \\chi",
  "Drift Angle": "\\mathrm{drift} = \\psi - \\chi",
  "Sideslip": "\\beta = \\text{sideslip angle}",
  "Sideslip Angle β": "\\beta = \\text{sideslip angle}",
  "HeadWind": "\\mathrm{HW} = V_w \\cos(\\psi_w - \\psi_{\\mathrm{RWY}})",
  "CrossWind": "\\mathrm{CW} = V_w \\sin(\\psi_w - \\psi_{\\mathrm{RWY}})",
  "AlongTrack Headwind": "\\mathrm{HW}_\\chi = V_w \\cos(\\psi_w - \\chi)",
  "HWχ": "\\mathrm{HW}_\\chi = V_w \\cos(\\psi_w - \\chi)",
  "AlongTrack Crosswind": "\\mathrm{CW}_\\chi = V_w \\sin(\\psi_w - \\chi)",
  "CWχ": "\\mathrm{CW}_\\chi = V_w \\sin(\\psi_w - \\chi)",
  "Wind Speed": "V_w = \\sqrt{\\mathrm{HW}^2 + \\mathrm{CW}^2}",
  "Wind Direction": "\\psi_w = \\text{meteorological wind direction from}",
  "Ground Speed": "V_{\\mathrm{ground}} = V_{\\mathrm{air}} + V_{\\mathrm{wind}}"
};

/**
 * Converts a raw equation string to LaTeX if no direct key mapping exists.
 */
function rawToLatex(raw: string): string {
  let s = raw.trim();
  // Basic replacements
  s = s.replace(/\s*=\s*/g, " = ");
  s = s.replace(/rho/g, "\\rho ");
  s = s.replace(/gamma/g, "\\gamma ");
  s = s.replace(/mu/g, "\\mu ");
  s = s.replace(/Delta\s*T/g, "\\Delta T");
  s = s.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
  s = s.replace(/([A-Za-z0-9_]+)\^2/g, "{$1}^2");
  s = s.replace(/([A-Za-z0-9_]+)\^3/g, "{$1}^3");
  return s;
}

/**
 * Renders an equation into a styled HTML string using KaTeX (LaTeX typesetting).
 */
export function renderEquationLaTeX(key: string, rawEq?: string): string {
  const latex = KEY_EQUATIONS_LATEX[key] || (rawEq && rawEq.trim() ? rawToLatex(rawEq) : "");
  if (!latex) return "";

  try {
    return katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
    });
  } catch (err) {
    console.warn("KaTeX render error:", err);
    return `<div style="font-family: monospace; text-align: center;">${latex}</div>`;
  }
}

/**
 * Backwards compatibility helper.
 */
export function renderEquationMathML(key: string, rawEq?: string): string {
  return renderEquationLaTeX(key, rawEq);
}
