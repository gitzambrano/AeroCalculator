# Technical Calculation Reference

## 1. Calculation architecture

AeroCalculator converts user inputs to internal units, solves the selected physical relationships, and then converts the outputs to display units. Sensor inputs must enter the same calculation path as equivalent manual inputs.

The current B4A source still combines parts of this flow in the main Activity. The architecture plan is to extract pure calculation blocks only after reference and characterization coverage exists.

## 2. Standard atmosphere

### 2.1 Sea-level reference

The repository uses these sea-level reference values:

$$
T_0=288.15\;\text{K},\quad
p_0=101325\;\text{Pa},\quad
\rho_0=1.225\;\text{kg/m}^3,
$$

and standard gravity:

$$
g_0=9.80665\;\text{m/s}^2.
$$

The independent Python reference model in `tools/reference_physics.py` implements the 1976 standard-atmosphere layer equations through 84.852 km geopotential altitude. The production B4A atmosphere path uses the same layer boundaries, base states, and lapse-rate signs.

### 2.2 Layer equation

For a layer with base temperature $T_b$, base pressure $p_b$, base altitude $H_b$, and lapse rate $L_b\neq0$:

$$
T=T_b+L_b(H-H_b),
$$

$$
p=p_b\left(\frac{T_b}{T}\right)^{g_0/(R L_b)}.
$$

For an isothermal layer:

$$
p=p_b\exp\left[-\frac{g_0(H-H_b)}{R T_b}\right].
$$

Density follows the perfect-gas relation:

$$
\rho=\frac{p}{RT}.
$$

### 2.3 Geometric and geopotential altitude

For effective Earth radius $r_e$:

$$
H=\frac{r_e h}{r_e+h},
\qquad
h=\frac{r_e H}{r_e-H}.
$$

### 2.4 Delta ISA

For temperature offset $\Delta T$:

$$
T_{actual}=T_{standard}+\Delta T.
$$

The current application keeps pressure tied to pressure altitude and applies the actual temperature to density.

### 2.5 Speed of sound and viscosity

For the local absolute static temperature $T$, with $\gamma=1.4$ and $R=287.05287$ J/(kg K),

$$
a=\sqrt{\gamma RT}.
$$

Both implementations use direct Sutherland-type viscosity formulas. They are similar but not identical. Web uses

$$
\mu_{\mathrm{web}}=\frac{1.458\times10^{-6}\,T^{3/2}}{T+110.4}\quad\mathrm{Pa\,s}.
$$

The existing Android implementation uses

$$
\mu_{\mathrm{Android}}=1.7894\times10^{-5}
\frac{T^{3/2}}{11.984(T+120)}\quad\mathrm{Pa\,s}.
$$

Here $T$ is in kelvins. Do not replace one formula with the other without documenting and testing a numerical change.

### 2.6 Layer boundaries and lookup

The ISA geopotential layer boundaries are 0, 11, 20, 32, 47, 51, 71, and 84.852 km. Their lapse rates are, in order, $-6.5$, $0$, $+1.0$, $+2.8$, $0$, $-2.8$, and $-2.0$ K/km. The base state for each successive layer is obtained by integrating the preceding layer to its boundary. Iteration over layer indices to select the applicable layer is a finite lookup, not an iterative convergence solver.

The production root finders extend their lower search bracket to $-5000$ m using the lowest-layer formula. This numerical extrapolation does not extend the 1976 standard-atmosphere reference range.

## 3. Altitude conversions and numerical solvers

### 3.1 Definitions and direct conversions

Pressure altitude $H_P$ is the geopotential altitude in the adopted ISA model for which $p_{\mathrm{ISA}}(H_P)=p_{\mathrm{actual}}$. Geopotential altitude $H$ and geometric altitude $h$ are related by the formulas in Section 2.3. A supplied geometric or GPS altitude is converted to $H$ before the altitude calculation.

To invert the standard-atmosphere pressure analytically, first identify the layer whose pressure interval contains $p$. For a non-isothermal layer,

$$
T^*=T_b\left(\frac{p}{p_b}\right)^{-RL_b/g_0},\qquad
H_P=H_b+\frac{T^*-T_b}{L_b}.
\tag{3.1}
$$

For an isothermal layer,

$$
H_P=H_b-\frac{RT_b}{g_0}\ln\left(\frac{p}{p_b}\right).
\tag{3.2}
$$

These equations are closed-form inversions and require **no numerical root finder**. The Web implementation bounds-checks the input pressure. Android evaluates the layer equations directly and warns for altitudes above its stated upper limit.

### 3.2 Adopted nonstandard-temperature relation

Both applications use the following relation to connect geopotential altitude, pressure altitude, and a local temperature deviation:

$$
H=H_P-C\Delta T_{\mathrm{ISA}}
\ln\left(\frac{p_{\mathrm{ISA}}(H_P)}{p_0}\right),
\qquad C=29.271247\ \mathrm{m/K}.
\tag{3.3}
$$

The constant is close to $R/g_0$. Equation (3.3) is the **adopted calculator correction**, not a general reconstruction of a nonstandard vertical temperature profile. For a specified $H_P$ and temperature, evaluate the right-hand side directly and then convert $H$ to geometric altitude. For a specified geometric altitude, however, $H_P$ is unknown and occurs inside the ISA pressure function. It is also inside the ISA-temperature function when the user supplies OAT.

### 3.3 Solver 1: geometric altitude to pressure altitude

Given input $H$ define a pressure-altitude candidate $x$ and the scalar residual (in meters)

$$
f(x)=x-H-C\,\Delta T(x)
\ln\left(\frac{p_{\mathrm{ISA}}(x)}{p_0}\right),
\tag{3.4}
$$

where

$$
\Delta T(x)=
\begin{cases}
\Delta T_{\mathrm{input}},&\text{Delta ISA selected},\\
T_{\mathrm{OAT}}-T_{\mathrm{ISA}}(x),&\text{OAT selected}.
\end{cases}
\tag{3.5}
$$

The production method is **Newton-Raphson with a bracketing and bisection safeguard**:

1. Set the initial bracket $[a,b]=[-5000,84852]$ m. Evaluate $f(a)$ and $f(b)$.
2. If $f(a)f(b)>0$, immediately return the input geopotential altitude $H$. This is a fallback value, **not a proven solution**.
3. Start with $x=H$. If $x$ is not strictly inside the bracket, start at $(a+b)/2$.
4. Evaluate $f(x)$. If $|f(x)|\le0.001$ m, return $x$.
5. Retain the half of the bracket that contains a sign change: replace $b$ by $x$ if $f(a)f(x)\le0$; otherwise replace $a$ by $x$.
6. Estimate the derivative from nearby points, clipped to the updated bracket:

   $$
   x_-=\max(a,x-1\ \mathrm m),\qquad x_+=\min(b,x+1\ \mathrm m),
   $$

   $$
   f'(x)\approx\frac{f(x_+)-f(x_-)}{x_+-x_-}.
   \tag{3.6}
   $$

   If $x_+=x_-$, set the derivative estimate to zero.
7. If $|f'(x)|>10^{-9}$, propose a Newton step $x_N=x-f(x)/f'(x)$. Otherwise propose $(a+b)/2$.
8. If the Newton proposal is outside the open bracket, substitute $(a+b)/2$. Continue from the accepted proposal.

The code performs **at most 40 iterations**. If it reaches the limit, it returns the last candidate without an explicit nonconvergence status. The $0.001$ m threshold is a *residual* tolerance, not a separately guaranteed altitude-error bound. The safeguard handles small derivatives and Newton steps outside the bracket; it does not prove convergence in the two fallback cases.

Android source: **CalcError** and **PressureAltitudeFromGeometricAltitude**, AeroCalculator.b4a. Web source: **pressureAltitudeFromGeopotentialAltitude**, web/src/core.ts. The two versions use the same initial bounds, perturbation, derivative threshold, iteration cap, and residual tolerance.

### 3.4 Solver 2: density altitude from density

Density altitude $H_\rho$ is defined by

$$
\rho_{\mathrm{ISA}}(H_\rho)=\rho_{\mathrm{actual}},\qquad
\rho_{\mathrm{actual}}=\frac{p_{\mathrm{ISA}}(H_P)}{RT}.
\tag{3.7}
$$

The ISA density profile is monotone decreasing over the implemented search range. Both applications use **bisection**:

1. Initialize $a=-5000$ m and $b=84852$ m.
2. Return $a$ if $\rho_{\mathrm{actual}}\ge\rho_{\mathrm{ISA}}(a)$. Return $b$ if $\rho_{\mathrm{actual}}\le\rho_{\mathrm{ISA}}(b)$. These are endpoint *clamps*, not extrapolated roots.
3. For each of 32 iterations, calculate $x=(a+b)/2$ and $\rho_x=\rho_{\mathrm{ISA}}(x)$.
4. If $\rho_x>\rho_{\mathrm{actual}}$, replace $a$ by $x$; otherwise replace $b$ by $x$.
5. Return the midpoint of the final bracket.

There is no residual-based early exit. After 32 iterations, the initial 89,852 m interval is at most $89852/2^{32}\approx2.09\times10^{-5}$ m wide. The bracketed mathematical root therefore differs from the returned midpoint by at most approximately $1.05\times10^{-5}$ m, excluding roundoff and model error.

Android source: **DensityAltitudeFromDensity** and **StandardDensityAtPressureAltitude**, AeroCalculator.b4a. Web source: **densityAltitudeFromDensity**, web/src/core.ts.

### 3.5 Analytical density-altitude inverse: possible alternative

An iteration is **not mathematically necessary** for density altitude. Let $\rho_b=p_b/(RT_b)$ for the ISA layer containing the target density. For a non-isothermal layer,

$$
\frac{\rho}{\rho_b}=
\left(\frac{T_b}{T}\right)^{1+g_0/(RL_b)}.
$$

Define $k=1+g_0/(RL_b)$. Then

$$
T=T_b\left(\frac{\rho_b}{\rho}\right)^{1/k},
\qquad H_\rho=H_b+\frac{T-T_b}{L_b}.
\tag{3.8}
$$

For an isothermal layer,

$$
H_\rho=H_b-\frac{RT_b}{g_0}\ln\left(\frac{\rho}{\rho_b}\right).
\tag{3.9}
$$

Equations (3.8) and (3.9) describe an alternative direct implementation. **The current Android and Web code still use bisection.** Any replacement must preserve interval handling and pass layer-boundary, density round-trip, and Android/Web parity tests.

### 3.6 Temperature altitude

The displayed temperature altitude is a tropospheric temperature-equivalent altitude, not a general inverse of the full ISA temperature profile:

$$
H_T=
\begin{cases}
11000(288.15-T)/71.5\ \mathrm m,&T>216.65\ \mathrm K,\\
11000\ \mathrm m,&T\le216.65\ \mathrm K.
\end{cases}
\tag{3.10}
$$

This calculation is direct and clamps the result at 11 km for temperatures at or below 216.65 K.

## 4. TAS, EAS, CAS, Mach, and input inversion

Mach number and equivalent airspeed are

$$
M=\frac{V_T}{a},\qquad
V_E=V_T\sqrt{\frac{\rho}{\rho_0}},\qquad
V_T=V_E\sqrt{\frac{\rho_0}{\rho}}.
\tag{4.1}
$$

For subsonic, isentropic compressible flow,

$$
q_c=p\left[\left(1+\frac{\gamma-1}{2}M^2\right)^{\gamma/(\gamma-1)}-1\right],
\tag{4.2}
$$

$$
M=\sqrt{\frac{2}{\gamma-1}
\left[\left(1+\frac{q_c}{p}\right)^{(\gamma-1)/\gamma}-1\right]}.
\tag{4.3}
$$

Calibrated airspeed is the ISA sea-level speed that yields the same impact pressure:

$$
a_0=\sqrt{\gamma RT_0},\qquad
V_C=a_0\sqrt{\frac{2}{\gamma-1}
\left[\left(1+\frac{q_c}{p_0}\right)^{(\gamma-1)/\gamma}-1\right]}.
\tag{4.4}
$$

For CAS input, first calculate the sea-level equivalent impact pressure,

$$
q_c=p_0\left[
\left(1+\frac{\gamma-1}{2}(V_C/a_0)^2\right)^{\gamma/(\gamma-1)}-1
\right].
\tag{4.5}
$$

Use Equation (4.3) at **local** pressure $p$ and then calculate $V_T=Ma$. For TAS input, calculate local Mach and impact pressure, then use Equation (4.4). Both directions are algebraic; neither uses iteration.

Other supported airspeed input modes solve TAS as follows:

| Input | Direct calculation or sequence |
|---|---|
| TAS | $V_T=V_{\mathrm{input}}$ |
| Mach | $V_T=Ma$ |
| EAS | $V_T=V_E\sqrt{\rho_0/\rho}$ |
| CAS | Equation (4.5), Equation (4.3), then $V_T=Ma$ |
| Dynamic pressure | $V_T=\sqrt{2q/\rho}$ |
| Impact pressure | Equation (4.3), then $V_T=Ma$ |
| Lift coefficient | $V_T=\sqrt{2N_Zmg_0/(\rho S_{\mathrm{REF}}C_L)}$ |
| VS Factor | $V_{C,\mathrm{target}}=F_VV_{S,C}+\Delta V_C$, then convert CAS to TAS |
| Ground speed | Recover TAS from the algebraic wind triangle in Section 10 |

The optional speed increment $\Delta V_C$ for VS Factor is specified in knots and converted to SI. After TAS has been determined, the application recomputes the remaining speed and aerodynamic outputs from one atmospheric state.

The current documented model supports $0\le M<1$ for impact-pressure conversion. The Web core rejects a computed Mach of 1 or greater. Neither application implements a supersonic normal-shock Pitot model.

## 5. Dynamic, impact, and total quantities

Dynamic pressure is kinetic energy per unit volume and is not the Pitot impact pressure:

$$
q=\frac12\rho V_T^2=\frac12\rho_0V_E^2.
$$

For the adopted isentropic perfect-gas model,

$$
T_t=T\left(1+\frac{\gamma-1}{2}M^2\right),\qquad
p_t=p\left(1+\frac{\gamma-1}{2}M^2\right)^{\gamma/(\gamma-1)}.
$$

Therefore $q_c=p_t-p$, whereas $q$ is computed from density and TAS. Total temperature is stagnation temperature; no separate recovery-factor model is applied.

## 6. Lift coefficient

For normal load factor $n$:

$$
C_L=\frac{nW}{qS}.
$$

The application uses mass as an input and converts it to weight with standard gravity.

## 7. Stall speed and VS Factor

The selected aircraft mass $m$, reference area $S_{\mathrm{REF}}$, and flap-dependent maximum lift coefficient $C_{L,\mathrm{MAX}}$ define the **1-g reference stall TAS**:

$$
V_{S,T,1g}=\sqrt{\frac{2mg_0}{\rho S_{\mathrm{REF}}C_{L,\mathrm{MAX}}}}.
$$

The displayed stall speed is the corresponding **CAS**, obtained through the same compressibility equations used for ordinary TAS-to-CAS conversion:

$$
V_{S,C}=\mathrm{CAS}(V_{S,T,1g},p,T).
$$

The current flight-state VS Factor is

$$
F_V=\frac{V_C}{V_{S,C}}.
$$

When VS Factor is the input, the target CAS is

$$
V_{C,\mathrm{target}}=F_{V,\mathrm{input}}V_{S,C}+\Delta V_C.
$$

The current stall-speed output is independent of the selected maneuver load factor. The theoretical accelerated-stall TAS is $V_{S,T,1g}\sqrt{N_Z}$ for positive $N_Z$, but this is **not** the value shown as Stall Speed VS.

## 8. Reynolds number

The reference relation is:

$$
Re=\frac{\rho V c}{\mu}.
$$

The reference chord and viscosity must use consistent SI units.

## 9. Load factor and bank angle

For a coordinated level turn:

$$
n=\frac{1}{\cos\phi},
\qquad
\phi=\cos^{-1}\left(\frac1n\right).
$$

The inverse requires $n\ge1$ for the conventional level-turn interpretation.

## 10. Wind triangle and navigation

All calculations use the velocity-vector identity

$$
\mathbf V_g=\mathbf V_a+\mathbf V_w.
\tag{10.1}
$$

Let $\psi$ be heading, $\chi$ ground track, $\alpha$ air-velocity direction, and $\beta$ sideslip. Angles are clockwise from true north in the application's horizontal coordinate convention. The implemented definitions are

$$
\beta=\alpha-\psi,\qquad \mathrm{drift}=\psi-\chi.
\tag{10.2}
$$

The air and ground vectors use the unit direction $\mathbf e(\theta)=(\cos\theta,\sin\theta)$. Positive headwind $HW$ is from ahead, and positive crosswind $CW$ is from the right. The wind reference direction is $\chi_{\mathrm{ref}}$. The implementation first constructs

$$
u_w=-HW\cos\chi_{\mathrm{ref}}+CW\sin\chi_{\mathrm{ref}},
$$

$$
v_w=-CW\cos\chi_{\mathrm{ref}}-HW\sin\chi_{\mathrm{ref}},\qquad
W_s=\sqrt{HW^2+CW^2}.
\tag{10.3}
$$

The meteorological wind-from direction is

$$
\psi_w=\mathrm{atan2}(v_w,u_w)+\pi.
\tag{10.4}
$$

The final along-track components are

$$
HW_{\mathrm{track}}=W_s\cos(\psi_w-\chi),\qquad
CW_{\mathrm{track}}=W_s\sin(\psi_w-\chi).
\tag{10.5}
$$

**Ground speed known, track specified:** Calculate $\mathbf V_g=GS\,\mathbf e(\chi)$, $\mathbf V_a=\mathbf V_g-\mathbf V_w$, $V_T=\|\mathbf V_a\|$, and $\alpha=\mathrm{atan2}(V_{a,y},V_{a,x})$. If heading and drift are supplied, first obtain $\chi=\psi-\mathrm{drift}$. Use the supplied sideslip or drift to recover the remaining angle.

**Ground speed known, heading and sideslip specified:** Set $\alpha=\psi+\beta$ and solve the quadratic magnitude equation

$$
\left\|V_T\mathbf e(\alpha)+\mathbf V_w\right\|^2=GS^2.
$$

With $w_\parallel=\mathbf V_w\cdot\mathbf e(\alpha)$, the chosen algebraic root is

$$
V_T=-w_\parallel+\sqrt{w_\parallel^2+GS^2-W_s^2}.
\tag{10.6}
$$

The code rejects a negative discriminant or a negative selected TAS. No iterative search is used.

**TAS known, heading and sideslip specified:** Set $\alpha=\psi+\beta$, calculate $\mathbf V_a=V_T\mathbf e(\alpha)$, and add the wind vector to determine the ground velocity, ground speed, and track.

**TAS known, track specified:** The air-velocity cross-track component must cancel the wind cross-track component. With

$$
w_\perp=-u_w\sin\chi+v_w\cos\chi,
$$

the implemented principal-branch solution is

$$
\alpha=\chi+\arcsin(-w_\perp/V_T).
\tag{10.7}
$$

The geometry requires $|w_\perp/V_T|\le1$. The program then reconstructs the missing heading or sideslip and the ground-velocity vector. It uses the principal inverse-trigonometric branch rather than enumerating alternative geometry branches.

With zero wind speed, meteorological wind direction is undefined and the UI displays an unavailable marker. The code normalizes angles by adding or subtracting $2\pi$ as needed. These loops are **not** iterative numerical solvers.

## 11. Validity limits and numerical behavior

- The standard atmosphere is documented through 84.852 km geopotential altitude. Numerical inverse solvers use the extended bracket from −5 km to 84.852 km. The Android app warns above its documented upper limit, and the Web core bounds-checks the standard-atmosphere altitude.
- The compressibility relations are subsonic, isentropic relations. Supersonic Pitot calculations are not modeled.
- The geometric-to-pressure-altitude solver returns input $H$ when its initial residuals do not have opposite signs. It also returns its last iterate at the 40-iteration cap. Neither fallback reports confirmed convergence.
- Density altitude clamps to a bracket endpoint when the requested density is outside the bracketed range. Its 32-step bisection has no early residual stop.
- Negative or zero density, pressure, absolute temperature, aerodynamic reference area, viscosity, and other singular input combinations are outside the applicable physics equations. The application must not present invalid finite outputs.
- Some wind geometries have no real solution. Inverse trigonometric and quadratic expressions require feasibility checks.
- Sensor accuracy and data quality are external to the numerical model.
- Temperature altitude uses the single tropospheric gradient with an 11 km lower-temperature clamp; it is not a unique inversion of the complete ISA temperature profile.

## 12. Turn radius and turn rate

For a coordinated constant-bank turn relative to the air mass, the radius and heading rate use true airspeed:

$$
R_{air}=\frac{V_T^2}{g\tan\phi},
\qquad
\dot\psi=\frac{g\tan\phi}{V_T}.
$$

A steady wind translates the air-relative circular trajectory; the ground track is generally not a circle. Therefore ground speed shall not be substituted into these coordinated-turn equations.



## 13. Additional derived outputs

The mass input $m$ is converted to force using $W=mg_0$. With $q=\rho V_T^2/2$ and lift coefficient $C_L=N_Zmg_0/(qS_{\mathrm{REF}})$, the outputs include

$
\frac{qS_{\mathrm{REF}}}{g_0}\ \mathrm{kgf},\qquad
\frac{C_LqS_{\mathrm{REF}}}{g_0}\ \mathrm{kgf},\qquad
\frac{m}{\delta}\ \mathrm{kgf},
$

where

$
\delta=\frac{p}{p_0},\qquad
\sigma=\frac{\rho}{\rho_0},\qquad
\theta=\frac{T}{T_0}.
$

The displayed aerodynamic lift force corresponds to $N_Zmg_0$. These quantities are calculated algebraically. Load factor and coordinated level-turn bank satisfy

$
N_Z=\frac{1}{\cos\phi},\qquad
\phi=\cos^{-1}(1/N_Z)\quad(N_Z\ge1).
$

For a pull-up load-factor input, the calculator does not infer turn bank. A bank-angle input uses the coordinated level-turn relation. For a nonzero bank angle and positive TAS, the turn-radius and turn-rate equations in Section 12 apply. Ground speed must not replace TAS in those equations.

## 14. Method summary and verification

| Calculation | Implemented method | Termination |
|---|---|---|
| Geometric altitude to pressure altitude | Safeguarded Newton with bisection fallback | $|f|\le0.001$ m, maximum 40 iterations |
| Actual density to density altitude | Bisection of ISA density | 32 iterations, or an endpoint clamp |
| Static pressure to pressure altitude | ISA layer lookup plus analytical inversion | Direct |
| Pressure altitude to geopotential/geometric altitude | Adopted local-temperature equation plus radius formula | Direct |
| Standard atmosphere at specified altitude | ISA layer lookup and hydrostatic formula | Direct |
| Mach, CAS, EAS, TAS, $q$, $q_c$ | Algebraic inversions | Direct |
| Ground speed and wind state | Vector relations, quadratic root, inverse trigonometry | Direct |
| Lift, stall speed, Reynolds, turns, ratios | Algebraic expressions | Direct |
| Angle normalization | Repeated $2\pi$ adjustments | Not a convergence solver |

Production source mapping:

- **Android:** AeroCalculator.b4a — **Calculate**, **CalcError**, **PressureAltitudeFromGeometricAltitude**, **DensityAltitudeFromDensity**, **PressureAltitudeFromStaticPressure**, **SetStandardAtmosphereFromPressureAltitude**, and **WindCalc**.
- **Web:** web/src/core.ts — **standardAtmosphere**, **pressureToGeopotentialAltitude**, **pressureAltitudeFromGeopotentialAltitude**, **densityAltitudeFromDensity**, **solveWindTriangle**, and the airspeed helpers; web/src/main.ts — **resolvePressureAltitude**, **resolveTas**, and **recalculate**.
- **Independent checks:** tools/reference_physics.py and tests/; see also [verification.md](verification.md).

Regression checks must include ISA layer boundaries; pressure-altitude forward/inverse round trips; geometric-pressure-altitude reversibility at positive and negative Delta ISA; density altitude at ISA, hot, cold, and bracket endpoints; subsonic CAS/TAS reversibility; the $q$/$q_c$ distinction; stall-speed independence from maneuver load factor; and strong-wind feasibility cases. Numerical changes require an independent physics reference and explicit tolerance.

## Physical interpretation in technical help

The quantity catalog stores a concise physical explanation for every input, output, and aircraft-data entry. Help distinguishes hydrostatic atmosphere, ideal-gas thermal state, pitot compression, aerodynamic force balance, coordinated-turn acceleration, and wind-vector projections. The calculation equations remain unchanged.

Primary references for the flow interpretation are NASA Glenn’s [dynamic pressure](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/dynamic-pressure/) and [isentropic flow equations](https://www.grc.nasa.gov/www/k-12/airplane/isentrop.html). Application-specific altitude conventions and display normalizations follow the equations documented above.
