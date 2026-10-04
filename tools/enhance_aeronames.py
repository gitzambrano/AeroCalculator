import re
from pathlib import Path

# Canonical LaTeX equations for AeroCalculator nomenclature
LATEX_EQUATIONS = {
    # Atmosphere & Altitudes
    "Hp": r"p_{\mathrm{ISA}}(H_p) = p",
    "Pressure Altitude": r"p_{\mathrm{ISA}}(H_p) = p",
    "Hg": r"h = \frac{r_0 \, H}{r_0 - H}",
    "Geometric Altitude": r"h = \frac{r_0 \, H}{r_0 - H}",
    "Geopotencial Altitude": r"H = \frac{r_0 \, h}{r_0 + h}",
    "Density Altitude": r"\rho_{\mathrm{ISA}}(H_\rho) = \rho",
    "Temperature Altitude": r"T_{\mathrm{ISA}}(H_T) = T",
    "P": r"p = \rho \, R \, T",
    "Pressure": r"p = \rho \, R \, T",
    "Δ ISA": r"\Delta T = T - T_{\mathrm{ISA}}(H_p)",
    "Delta ISA": r"\Delta T = T - T_{\mathrm{ISA}}(H_p)",
    "OAT": r"T = T_{\mathrm{ISA}}(H_p) + \Delta T",
    "Temperature": r"T = T_{\mathrm{ISA}}(H_p) + \Delta T",
    "Total Temperature": r"T_t = T \left( 1 + \frac{\gamma - 1}{2} M^2 \right)",
    "Density": r"\rho = \frac{p}{R \, T}",
    "Viscosity": r"\mu = \mu_0 \, \frac{T_0 + C}{T + C} \left( \frac{T}{T_0} \right)^{3/2}",
    "Sound Speed": r"a = \sqrt{\gamma \, R \, T}",

    # Airspeeds & Aerodynamics
    "TAS": r"\mathrm{TAS} = M \cdot a",
    "True Airspeed": r"\mathrm{TAS} = M \cdot a",
    "CAS": r"\mathrm{CAS} = a_0 \sqrt{\frac{2}{\gamma - 1} \left[ \left( \frac{q_c}{p_0} + 1 \right)^{\frac{\gamma - 1}{\gamma}} - 1 \right]}",
    "Calibrated Airspeed": r"\mathrm{CAS} = a_0 \sqrt{\frac{2}{\gamma - 1} \left[ \left( \frac{q_c}{p_0} + 1 \right)^{\frac{\gamma - 1}{\gamma}} - 1 \right]}",
    "EAS": r"\mathrm{EAS} = \mathrm{TAS} \sqrt{\frac{\rho}{\rho_0}}",
    "Equivalent Airspeed": r"\mathrm{EAS} = \mathrm{TAS} \sqrt{\frac{\rho}{\rho_0}}",
    "Mach": r"M = \frac{\mathrm{TAS}}{a}",
    "CL": r"C_L = \frac{n \cdot m \cdot g_0}{q \cdot S_{\mathrm{ref}}}",
    "Lift Coefficient CL": r"C_L = \frac{n \cdot m \cdot g_0}{q \cdot S_{\mathrm{ref}}}",
    "Vs Factor": r"\mathrm{CAS} = \mathrm{factor} \times V_{s,\mathrm{CAS}} + \Delta \mathrm{CAS}",
    "Ground Speed": r"V_{\mathrm{ground}} = V_{\mathrm{air}} + V_{\mathrm{wind}}",
    "Stall Speed Vs": r"V_{s,\mathrm{TAS}} = \sqrt{\frac{2 \, m \, g_0}{\rho \, S_{\mathrm{ref}} \, C_{L,\max}}}",
    "Qdyn": r"q = \frac{1}{2} \rho \, \mathrm{TAS}^2",
    "Dynamic Pressure": r"q = \frac{1}{2} \rho \, \mathrm{TAS}^2",
    "Qc": r"q_c = p \left[ \left( 1 + \frac{\gamma - 1}{2} M^2 \right)^{\frac{\gamma}{\gamma - 1}} - 1 \right]",
    "Impact Pressure": r"q_c = p \left[ \left( 1 + \frac{\gamma - 1}{2} M^2 \right)^{\frac{\gamma}{\gamma - 1}} - 1 \right]",
    "Total Pressure": r"p_t = p + q_c",
    "Reynolds": r"\mathrm{Re} = \frac{\rho \, \mathrm{TAS} \, c_{\mathrm{ref}}}{\mu}",

    # Non-dimensional ratios
    "Pressure Ratio δ": r"\delta = \frac{p}{p_0}",
    "Density Ratio σ": r"\sigma = \frac{\rho}{\rho_0}",
    "Temperature Ratio θ": r"\theta = \frac{T}{T_0}",

    # Forces & Geometry
    "Weight": r"W = m \cdot g_0",
    "Sref": r"L = q \, S_{\mathrm{ref}} \, C_L",
    "cref": r"\mathrm{Re} = \frac{\rho \, \mathrm{TAS} \, c_{\mathrm{ref}}}{\mu}",
    "CLmax": r"V_{s,\mathrm{TAS}} = \sqrt{\frac{2 \, m \, g_0}{\rho \, S_{\mathrm{ref}} \, C_{L,\max}}}",
    "CLmaxFlap": r"V_{s,\mathrm{TAS}} = \sqrt{\frac{2 \, m \, g_0}{\rho \, S_{\mathrm{ref}} \, C_{L,\max}}}",
    "DynPressure * S / g": r"\frac{q \cdot S_{\mathrm{ref}}}{g_0}",
    "Lift Force": r"\frac{L}{g_0} = \frac{q \cdot S_{\mathrm{ref}} \cdot C_L}{g_0} = n \cdot m",
    "Weight/Delta W/δ": r"\frac{W}{\delta \cdot g_0} = \frac{m}{\delta}",

    # Maneuvers
    "NzPullup": r"L = n \cdot m \cdot g_0",
    "NzTurn": r"n = \frac{1}{\cos \varphi}",
    "BankTurn": r"n = \frac{1}{\cos \varphi}",
    "Load Factor Nz": r"n = \frac{L}{W} = \frac{1}{\cos \varphi}",
    "Bank Angle φ": r"n = \frac{1}{\cos \varphi}",
    "Turn Radius": r"r = \frac{\mathrm{TAS}^2}{g_0 \tan \varphi}",
    "Turn Rate": r"\omega = \frac{g_0 \tan \varphi}{\mathrm{TAS}}",

    # Navigation & Wind
    "Track": r"\vec{V}_{\mathrm{ground}} = \vec{V}_{\mathrm{air}} + \vec{V}_{\mathrm{wind}}",
    "Track Angle": r"\vec{V}_{\mathrm{ground}} = \vec{V}_{\mathrm{air}} + \vec{V}_{\mathrm{wind}}",
    "Heading": r"\psi = \text{aircraft heading}",
    "Heading Angle Ψ": r"\psi = \text{aircraft heading}",
    "Sideslip": r"\beta = \text{sideslip angle}",
    "Sideslip Angle β": r"\beta = \text{sideslip angle}",
    "Drift": r"\mathrm{drift} = \psi - \chi",
    "Drift Angle": r"\mathrm{drift} = \psi - \chi",
    "HeadWind": r"\mathrm{HW} = V_w \cos(\psi_w - \psi_{\mathrm{RWY}})",
    "CrossWind": r"\mathrm{CW} = V_w \sin(\psi_w - \psi_{\mathrm{RWY}})",
    "AlongTrack Headwind": r"\mathrm{HW}_\chi = V_w \cos(\psi_w - \chi)",
    "AlongTrack Crosswind": r"\mathrm{CW}_\chi = V_w \sin(\psi_w - \chi)",
    "Wind Speed": r"V_w = \sqrt{\mathrm{HW}^2 + \mathrm{CW}^2}",
    "Runway Angle": r"\psi_{\mathrm{RWY}} = \text{runway heading}",
    "Wind Direction": r"\psi_w = \text{meteorological wind direction}",

    # Aircraft mass presets
    "mass.MTOW": r"W = m \cdot g_0",
    "mass.MLW": r"W = m \cdot g_0",
    "mass.MZFW": r"W = m \cdot g_0",
    "mass.BOW": r"W = m \cdot g_0",
    "mass.Heavy": r"W = m \cdot g_0",
    "mass.Light": r"W = m \cdot g_0",
}

def update_aeronames():
    path = Path("AeroNames.bas")
    content = path.read_text(encoding="utf-8")

    # Update equation lines inside Case blocks
    # Pattern: Case "Key" ... Equation: ... & CRLF
    for key, latex in LATEX_EQUATIONS.items():
        # Escape backslashes for B4A string literal
        b4a_latex = latex.replace('"', '""')
        
        # Regex to find Case "key" block and replace its Equation: ... & CRLF
        pattern = re.compile(rf'(Case\s+"{re.escape(key)}"\s+Return\s+.*?"Equation:\s*)(.*?)(?=" & CRLF & CRLF & "SI)', re.DOTALL)
        def repl_func(m, eq=b4a_latex):
            return m.group(1) + eq
        if pattern.search(content):
            content = pattern.sub(repl_func, content)
        else:
            # Try alternate matching if spacing differs
            pass

    path.write_text(content, encoding="utf-8")
    print(f"Updated AeroNames.bas with {len(LATEX_EQUATIONS)} canonical LaTeX equations.")

if __name__ == "__main__":
    update_aeronames()
