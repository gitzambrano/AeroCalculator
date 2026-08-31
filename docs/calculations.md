# Technical Calculation Reference

## 1. Calculation architecture

AeroCalculator converts user inputs to internal units, solves the selected physical relationships, then converts the outputs to display units. Sensor inputs must enter the same calculation path as equivalent manual inputs.

The current B4A source still combines parts of this flow in the main Activity. The architecture plan is to extract pure calculation blocks only after reference and characterization coverage exists.

## 2. Standard atmosphere

### 2.1 Sea-level reference

The repository uses:

\[
T_0=288.15\;\text{K},\quad
p_0=101325\;\text{Pa},\quad
\rho_0=1.225\;\text{kg/m}^3,
\]

and standard gravity:

\[
g_0=9.80665\;\text{m/s}^2.
\]

The independent Python reference model in `tools/reference_physics.py` implements the 1976 standard-atmosphere layer equations through 84.852 km geopotential altitude. The production B4A atmosphere path uses the same layer boundaries, base states, and lapse-rate signs.

### 2.2 Layer equation

For a layer with base temperature \(T_b\), base pressure \(p_b\), base altitude \(H_b\), and lapse rate \(L_b\neq0\):

\[
T=T_b+L_b(H-H_b),
\]

\[
p=p_b\left(\frac{T_b}{T}\right)^{g_0/(R L_b)}.
\]

For an isothermal layer:

\[
p=p_b\exp\left[-\frac{g_0(H-H_b)}{R T_b}\right].
\]

Density follows the perfect-gas relation:

\[
\rho=\frac{p}{RT}.
\]

### 2.3 Geometric and geopotential altitude

For effective Earth radius \(r_e\):

\[
H=\frac{r_e h}{r_e+h},
\qquad
h=\frac{r_e H}{r_e-H}.
\]

### 2.4 Delta ISA

For temperature offset \(\Delta T\):

\[
T_{actual}=T_{standard}+\Delta T.
\]

The current application keeps pressure tied to pressure altitude and applies the actual temperature to density.

### 2.5 Speed of sound and viscosity

Speed of sound is:

\[
a=\sqrt{\gamma R T}.
\]

Dynamic viscosity uses a Sutherland-type temperature relation. The implementation constants must stay documented beside the code when the calculation core is extracted.

## 3. Altitude conversions

Pressure altitude is the geopotential altitude in the adopted standard atmosphere corresponding to static pressure. The forward and inverse functions must round-trip within tolerance.

Geometric altitude and pressure altitude are not interchangeable. Nonstandard temperature affects the geometric relation used by the existing application, so regression tests must cover hot and cold conditions.

## 4. TAS, EAS, CAS, and Mach

Mach number is:

\[
M=\frac{V_T}{a}.
\]

Equivalent airspeed is:

\[
V_E=V_T\sqrt{\frac{\rho}{\rho_0}}.
\]

For subsonic isentropic flow, impact pressure is:

\[
q_c=p\left[\left(1+\frac{\gamma-1}{2}M^2\right)^{\gamma/(\gamma-1)}-1\right].
\]

CAS is the sea-level speed that produces the same impact pressure:

\[
V_C=a_0\sqrt{\frac{2}{\gamma-1}
\left[
\left(\frac{q_c}{p_0}+1\right)^{(\gamma-1)/\gamma}-1
\right]}.
\]

The present application is primarily a subsonic calculator. Supersonic pitot relations are not claimed unless explicitly implemented and tested later.

## 5. Dynamic and total quantities

Dynamic pressure is:

\[
q=\frac12\rho V_T^2.
\]

For a calorically perfect gas:

\[
T_t=T\left(1+\frac{\gamma-1}{2}M^2\right),
\]

\[
p_t=p\left(1+\frac{\gamma-1}{2}M^2\right)^{\gamma/(\gamma-1)}.
\]

## 6. Lift coefficient

For normal load factor \(n\):

\[
C_L=\frac{nW}{qS}.
\]

The application uses mass as an input and converts it to weight with standard gravity.

## 7. Stall speed and Vs factor

For the selected \(C_{L,max}\):

\[
V_s=\sqrt{\frac{2nW}{\rho S C_{L,max}}}.
\]

The application derives corresponding Mach and CAS values through the same atmosphere and compressibility model.

## 8. Reynolds number

The reference relation is:

\[
Re=\frac{\rho V c}{\mu}.
\]

The reference chord and viscosity must use consistent SI units.

## 9. Load factor and bank angle

For a coordinated level turn:

\[
n=\frac{1}{\cos\phi},
\qquad
\phi=\cos^{-1}\left(\frac1n\right).
\]

The inverse requires \(n\ge1\) for the conventional level-turn interpretation.

## 10. Wind triangle

Horizontal inertial velocity is the sum of air-relative velocity and wind velocity:

\[
\mathbf V_g=\mathbf V_a+\mathbf V_w.
\]

The implementation solves different combinations of known heading, track, sideslip, drift, TAS, ground speed, and wind. Tests must emphasize vector identities instead of copying one algebraic form.

## 11. Validity limits

- The standard-atmosphere model is valid from 0 km through 84.852 km geopotential altitude.
- The CAS relation documented here is the subsonic isentropic relation.
- Sensor accuracy is external to the numerical model.
- Very strong-wind geometries can make inverse trigonometric solutions infeasible. The UI must report such cases instead of producing a plausible invalid result.
- The B4A application warns when pressure altitude exceeds 84.852 km. It does not claim valid standard-atmosphere output above that limit.
