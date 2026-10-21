# AeroCalculator — Calculation Reference

This document specifies the physical quantities, constants, equations, algorithms, assumptions, and limits needed to reproduce **all calculator outputs**. It reflects the current Android B4A application and the Web TypeScript implementation. Where the two differ, their distinct numerical behavior is documented. It is not a claim that every approximation is a general atmospheric or flight-dynamics model.

The calculation order is: normalize inputs to SI; resolve pressure altitude and actual atmospheric state; obtain altitude outputs; resolve aircraft configuration, load factor, and 1-g stall speed; resolve true airspeed and wind triangle; calculate derived quantities; convert and round outputs. Android GPS, temperature, and pressure sensors supply values to the same manual-input paths. Web has no device-sensor modes.

## 1. Symbols and constants

### 1.1 Variables

| Symbol | Meaning | SI unit |
|---|---|---|
| \(h\), \(H\), \(H_P\), \(H_\rho\), \(H_T\) | Geometric, geopotential, pressure, density, and temperature altitude | m |
| \(p\), \(T\), \(\rho\) | Static pressure, absolute temperature, density | Pa, K, kg/m³ |
| \(H_b\), \(T_b\), \(p_b\), \(L_b\) | ISA layer-base altitude, temperature, pressure, lapse rate \(dT/dH\) | m, K, Pa, K/m |
| \(\Delta T\) | OAT minus ISA temperature at pressure altitude | K |
| \(V_T\), \(V_E\), \(V_C\), \(V_{S,T}\), \(V_{S,C}\) | True, equivalent, calibrated, stall TAS and stall CAS | m/s |
| \(GS\), \(V_w\), \(a\), \(\mu\) | Ground speed, wind speed, sound speed, dynamic viscosity | m/s, m/s, m/s, Pa·s |
| \(M\), \(Re\), \(C_L\), \(C_{L,\max}\), \(N_Z\) | Mach, Reynolds, lift coefficient, maximum lift coefficient, load factor | dimensionless |
| \(m\), \(W\), \(S\), \(c\) | Aircraft mass, weight force, wing reference area, reference chord | kg, N, m², m |
| \(q\), \(q_c\), \(p_t\), \(T_t\) | Dynamic pressure, impact pressure, total pressure, total temperature | Pa, Pa, Pa, K |
| \(\psi\), \(\chi\), \(\chi_a\), \(\beta\), \(d\), \(\phi\) | Heading, ground track, air-relative course, horizontal sideslip, drift, bank | rad |
| \(HW\), \(CW\), \(\psi_w\), \(\chi_r\) | Signed headwind, signed crosswind, meteorological wind-from direction, runway/reference direction | m/s, m/s, rad, rad |

**Notation:** \(\chi_a\) is the *horizontal azimuth of aircraft velocity relative to the air*, measured clockwise from north. It is **not** the aerodynamic angle of attack \(\alpha\), the ground track \(\chi\), or the direction from which the wind blows. The app uses a horizontal wind model, not a full six-degree-of-freedom wind-axis transformation.

### 1.2 Fundamental numerical parameters

| Parameter | Symbol | Implemented value | Unit |
|---|---|---:|---|
| ISA sea-level temperature | \(T_0\) | 288.15 | K |
| ISA sea-level pressure | \(p_0\) | 101325 | Pa |
| Reference sea-level density | \(\rho_0\) | 1.225 | kg/m³ |
| Standard gravity | \(g_0\) | 9.80665 | m/s² |
| Specific gas constant, dry air | \(R\) | 287.05287 | J/(kg·K) |
| Specific heat ratio | \(\gamma\) | 1.4 | — |
| Effective Earth radius | \(r_e\) | 6356766 | m |
| Altitude correction coefficient | \(C_H\) | 29.271247 | m/K |
| Numerical lower altitude | \(H_{\min}\) | −5000 | m |
| Numerical upper altitude | \(H_{\max}\) | 84852 | m |
| Android reference sound speed | \(a_{0,A}\) | 340.294 | m/s |
| Android exponential constant | \(e_A\) | 2.71828182846 | — |

Web evaluates \(a_0=\sqrt{\gamma RT_0}\). Android uses the tabulated 340.294 m/s reference when converting Mach and CAS. The independent reference value \(p_0/(RT_0)=1.225000018\) kg/m³ differs slightly from the specified \(\rho_0=1.225\); do not remove this small inconsistency when reproducing platform calculations.

### 1.3 Conversion parameters

Multiply inputs by these factors to obtain SI, except for absolute temperature. Divide SI outputs by the same factors to obtain display values.

| Quantity | User unit | SI factor |
|---|---|---|
| Altitude, length | m; km; ft; in; nm; mi | 1; 1000; 0.3048; 0.0254; 1852; 1609.344 |
| Speed | m/s; kt; km/h; mph; ft/s | 1; 1852/3600; 1/3.6; 0.44704; 0.3048 |
| Pressure | Pa; hPa; mbar; atm | 1; 100; 100; 101325 |
| Pressure, Web | mmHg; psi | 133.322387415; 6894.757293168 |
| Pressure, Android | mmHg; psi | 133.3223684; 6894.75729 |
| Mass | kg; lb; metric ton; oz | 1; 0.45359237; 1000; 0.028349523125 |
| Mass, Web / Android | slug | 14.59390294 / 14.5939029 |
| Area | m²; ft²; in²; cm²; mm² | 1; 0.09290304; 0.00064516; 0.0001; 0.000001 |
| Reference chord | m; ft; in; cm; mm | 1; 0.3048; 0.0254; 0.01; 0.001 |
| Angle | rad; deg | 1; \(\pi/180\) |

Absolute temperature conversions are \(T_K=T_C+273.15\) and \(T_K=(T_F-32)5/9+273.15\). A **temperature difference** uses \(\Delta T_K=\Delta T_C=(5/9)\Delta T_F\), with no offset. The VS Factor additive speed correction is entered in knots even when other speed units differ: Android uses 0.51444444 m/s per knot in this input; Web uses 1852/3600. A Mach number, lift coefficient, or VS Factor is dimensionless.

## 2. Standard atmosphere

### 2.1 Physical equations

The modeled atmosphere is hydrostatic and assumes an ideal gas. Geopotential altitude \(H\) allows constant standard gravity in the hydrostatic relation:

```math
\frac{dp}{dH}=-\rho g_0,\qquad p=\rho RT.
```

Within a layer beginning at \(H_b,T_b,p_b\), the ISA temperature gradient \(L_b\) is constant:

```math
T_{\mathrm{ISA}}(H)=T_b+L_b(H-H_b).
```

Integration of the hydrostatic relation gives **two cases**. For a gradient layer (\(L_b\ne0\)):

```math
p_{\mathrm{ISA}}(H)=p_b
\left(\frac{T_b}{T_{\mathrm{ISA}}(H)}\right)^{g_0/(RL_b)}.
```

For an isothermal layer (\(L_b=0\)):

```math
p_{\mathrm{ISA}}(H)=p_b\exp\left[-\frac{g_0(H-H_b)}{RT_b}\right].
```

Density then follows directly:

```math
\rho_{\mathrm{ISA}}(H)=\frac{p_{\mathrm{ISA}}(H)}{RT_{\mathrm{ISA}}(H)}.
```

### 2.2 ISA layer table

These are **geopotential** altitude ranges. Each base state is generated from the preceding layer using the equations above and the constants in Section 1. The final row is the upper boundary, not another layer.

| \(H\) range (km) | \(L_b\) (K/km) | \(T_b\) (K) | \(p_b\) (Pa) | \(\rho_b\) (kg/m³) |
|---|---:|---:|---:|---:|
| 0–11 | −6.5 | 288.15 | 101325.000 | 1.225000018 |
| 11–20 | 0 | 216.65 | 22632.040 | 0.363917648 |
| 20–32 | +1.0 | 216.65 | 5474.877 | 0.088034685 |
| 32–47 | +2.8 | 228.65 | 868.016 | 0.013224965 |
| 47–51 | 0 | 270.65 | 110.906 | 0.001427527 |
| 51–71 | −2.8 | 270.65 | 66.939 | 0.000861601 |
| 71–84.852 | −2.0 | 214.65 | 3.956392 | 0.0000642106 |
| Upper limit 84.852 | — | 186.946 | 0.3733803 | 0.00000695782 |

The layer-base values shown here are rounded **for display**. For Web numerical reproduction, recursively propagate the unrounded states. Below 0 m, the lowest layer is extrapolated for the −5 km numerical bracket. This is a software extension, not an extension of the published ISA reference domain.

### 2.3 Android ISA constants

Unlike Web, Android stores rounded pressure ratios for the layer bases. Its forward calculations use:

| \(H_b\) (m) | Stored \(p_b/p_0\) | Pressure exponent / method |
|---:|---:|---|
| 0 | 1 | \((T/288.15)^{5.2558797}\) |
| 11000 | 0.223360869430 | Isothermal exponential |
| 20000 | 0.054032839124 | \((216.65/T)^{34.16320}\) |
| 32000 | 0.008566649658 | \((228.65/T)^{12.20114}\) |
| 47000 | 0.001094554881 | Isothermal exponential |
| 51000 | 0.000660631908 | \((T/270.65)^{12.20114}\) |
| 71000 | 0.000039046555 | \((T/214.65)^{17.08160}\) |

For a given layer multiply its stored pressure ratio by the relevant temperature-power or exponential factor from Section 2.1. For a faithful Android reproduction, use the displayed exponent digits and the corresponding reference temperature/altitude. Android's inverse-pressure formulas use the same rounded coefficients.

### 2.4 Actual atmospheric state and ratios

Pressure altitude \(H_P\) determines pressure through ISA, even if the user supplies nonstandard OAT. Temperature and density follow:

```math
p=p_{\mathrm{ISA}}(H_P),\qquad
T=T_{\mathrm{ISA}}(H_P)+\Delta T,\qquad
\Delta T=T-T_{\mathrm{ISA}}(H_P).
```

With an OAT input, \(T\) is prescribed. With a Delta ISA input, \(\Delta T\) is prescribed. The actual Web density is \(\rho=p/(RT)\); Android computes \(\rho=\rho_0(p/p_0)/(T/T_0)\). Define the reported ratios:

```math
\delta=p/p_0,\qquad \sigma=\rho/\rho_0,\qquad \theta=T/T_0.
```

These local relations do not reconstruct a general vertical nonstandard temperature profile.

## 3. Altitude conversions

### 3.1 Geometric and geopotential altitude

Geometric altitude \(h\) is geometric height relative to the reference datum. Geopotential altitude \(H\) is an equivalent potential-energy height for constant \(g_0\):

```math
H=\frac{r_eh}{r_e+h},\qquad
h=\frac{r_eH}{r_e-H}.
```

Pressure altitude \(H_P\) is the ISA geopotential altitude at the measured static pressure, which generally differs from \(h\) and \(H\).

### 3.2 Static pressure to pressure altitude: direct inversion

Identify the ISA layer containing the input pressure, then invert its pressure equation. For a non-isothermal layer:

```math
T^\star=T_b\left(\frac{p}{p_b}\right)^{-RL_b/g_0},\qquad
H_P=H_b+\frac{T^\star-T_b}{L_b}.
```

For an isothermal layer:

```math
H_P=H_b-\frac{RT_b}{g_0}\ln\left(\frac{p}{p_b}\right).
```

**No root-finding iteration** is required. Web checks its supported pressure interval. Android selects branches using its stored pressure ratios; outside-range behavior is not fully identical.

### 3.3 Nonstandard-temperature correction

The implemented approximation relating pressure altitude to geopotential altitude is:

```math
H=H_P-C_H\Delta T
\ln\left(\frac{p_{\mathrm{ISA}}(H_P)}{p_0}\right),\qquad
C_H=29.271247\ {\rm m/K}.
```

The relation is direct if \(H_P\) is known. If geometric altitude is specified, first compute \(H\) and then solve the implicit equation for \(H_P\). This formula uses a *local* temperature deviation for an extended pressure interval. It is therefore an **adopted approximation**, not an exact general hydrostatic integration of a measured vertical temperature profile.

### 3.4 Geopotential altitude to pressure altitude: Newton with bisection safeguard

Define the residual in meters with candidate \(x=H_P\):

```math
f(x)=x-H-C_H\Delta T(x)\ln\left(\frac{p_{\mathrm{ISA}}(x)}{p_0}\right).
```

Use \(\Delta T(x)=\Delta T_{\rm input}\) for Delta ISA input, or \(\Delta T(x)=T_{\rm OAT}-T_{\mathrm{ISA}}(x)\) for OAT input. The Android and Web methods agree:

1. Set \([a,b]=[-5000,84852]\) m. If \(f(a)f(b)>0\), **return \(H\)**. This is a fallback, **not verified convergence**.
2. Initialize \(x=H\) if it lies inside the bracket; otherwise choose \((a+b)/2\).
3. Stop if \(|f(x)|\le0.001\) m. Otherwise retain the bracket half containing the sign change.
4. Use a clipped finite-difference derivative with \(x_-=\max(a,x-1\ {\rm m})\), \(x_+=\min(b,x+1\ {\rm m})\):

   ```math
   f'(x)\approx\frac{f(x_+)-f(x_-)}{x_+-x_-}.
   ```

5. If \(x_+=x_-\), take the derivative as zero. If \(|f'(x)|>10^{-9}\), propose \(x_N=x-f(x)/f'(x)\); otherwise propose the bracket midpoint. If \(x_N\) lies outside the open bracket, use its midpoint.
6. Execute at most **40 iterations**. If the cap is reached, return the last candidate without explicitly reporting failure.

The threshold is a **residual tolerance**, not a separately certified pressure-altitude error. This is the only Newton-type numerical root solver in the main calculation path.

### 3.5 Density altitude: 32-step bisection

Density altitude \(H_\rho\) is the ISA altitude with the same density as the calculated actual state:

```math
\rho_{\mathrm{ISA}}(H_\rho)=\rho.
```

The algorithm brackets \(H_\rho\) between −5000 and 84852 m. If \(\rho\) is greater than the lower-end density, return −5000 m; if it is smaller than the upper-end density, return 84852 m. Otherwise evaluate the midpoint density and retain the half-bracket containing \(\rho\), **32 times**, then return the final midpoint. The final altitude bracket width is approximately \(89852/2^{32}=2.09\times10^{-5}\) m. This is a deterministic numerical inversion, not a model of changing altitude with time.

A **not-yet-implemented** closed-form alternative exists for each ISA layer. With \(\rho_b=p_b/(RT_b)\) and \(k=1+g_0/(RL_b)\), gradient-layer inversion gives:

```math
T=T_b\left(\frac{\rho_b}{\rho}\right)^{1/k},\qquad
H_\rho=H_b+\frac{T-T_b}{L_b}.
```

For an isothermal layer:

```math
H_\rho=H_b-\frac{RT_b}{g_0}\ln\left(\frac{\rho}{\rho_b}\right).
```

These are alternatives **only**. The actual Android and Web products use bisection.

### 3.6 Temperature altitude

The app applies only the **tropospheric** ISA temperature gradient, with a lower-temperature clamp:

```math
H_T=\begin{cases}
11000(288.15-T)/71.5\ {\rm m},&T>216.65\ {\rm K},\\
11000\ {\rm m},&T\le216.65\ {\rm K}.
\end{cases}
```

Temperature altitude is a temperature-equivalent reference quantity, not a unique inverse of the full multilayer ISA temperature profile.

## 4. Sound speed and viscosity

Sound speed follows the perfect-gas model with actual static temperature:

```math
a_{\rm Web}=\sqrt{\gamma RT},\qquad
a_{\rm Android}=340.294\sqrt{T/288.15}\ {\rm m/s}.
```

Viscosity represents the molecular transport of momentum and depends on temperature. The implemented Sutherland-type formulas are **different**:

```math
\mu_{\rm Web}=\frac{1.458\times10^{-6}T^{3/2}}{T+110.4}\ {\rm Pa\,s}.
```

```math
\mu_{\rm Android}=1.7894\times10^{-5}
\frac{T^{3/2}}{11.984(T+120)}\ {\rm Pa\,s}.
```

Use absolute temperature in kelvins in both expressions. No numerical iteration occurs.

## 5. Airspeed and compressibility

### 5.1 Air-relative speed, Mach, EAS, and dynamic pressure

TAS \(V_T\) is speed relative to the air. Mach compares TAS with local sound speed. EAS is the ISA sea-level speed with the same **dynamic pressure**:

```math
M=\frac{V_T}{a},\qquad
q=\frac12\rho V_T^2,\qquad
V_E=V_T\sqrt{\frac{\rho}{\rho_0}}.
```

Thus \(q=\rho_0V_E^2/2\). Dynamic pressure \(q\) must not be confused with Pitot impact pressure \(q_c\).

### 5.2 Impact pressure, total conditions, and inverse Mach

For the adopted **subsonic isentropic** flow model:

```math
q_c=p\left[\left(1+\frac{\gamma-1}{2}M^2\right)^{\gamma/(\gamma-1)}-1\right].
```

The analytical inverse is:

```math
M=\sqrt{\frac{2}{\gamma-1}
\left[\left(1+\frac{q_c}{p}\right)^{(\gamma-1)/\gamma}-1\right]}.
```

```math
p_t=p+q_c,\qquad T_t=T\left(1+\frac{\gamma-1}{2}M^2\right).
```

With \(\gamma=1.4\), the pressure exponent is **3.5**, the inverse exponent is **1/3.5**, and the temperature factor is **\(1+0.2M^2\)**. No shock, probe-recovery factor, or instrument calibration correction is modeled.

### 5.3 CAS definition and inversion

CAS \(V_C\) is ISA sea-level speed producing the same impact pressure as the local flow:

```math
V_C=a_0\sqrt{\frac{2}{\gamma-1}
\left[\left(1+\frac{q_c}{p_0}\right)^{(\gamma-1)/\gamma}-1\right]}.
```

To convert CAS input into TAS, first obtain the impact pressure:

```math
q_c=p_0\left[\left(1+\frac{\gamma-1}{2}(V_C/a_0)^2\right)^{\gamma/(\gamma-1)}-1\right].
```

Then solve for Mach using **local** pressure \(p\) in Section 5.2 and compute \(V_T=Ma\). Both directions are **analytical**. For platform fidelity, use the corresponding \(a_0\) from Section 1 or Section 4.

### 5.4 Primary speed-input modes

Exactly one of the following selects TAS; all other speed quantities are calculated afterward.

| Selected input | TAS computation |
|---|---|
| TAS | \(V_T=V_{\rm input}\) |
| Mach | \(V_T=Ma\) |
| EAS | \(V_T=V_E\sqrt{\rho_0/\rho}\) |
| CAS | CAS \(\rightarrow q_c\rightarrow M\rightarrow V_T\) |
| Dynamic pressure | \(V_T=\sqrt{2q/\rho}\) |
| Impact pressure | \(q_c\rightarrow M\rightarrow V_T=Ma\) |
| Lift coefficient | \(V_T=\sqrt{2N_Zmg_0/(\rho S C_L)}\) |
| VS Factor | \(V_{C,\rm target}=F_VV_{S,C}+\Delta V_C\); convert CAS to TAS |
| Ground speed | Solve TAS from horizontal wind vector in Section 8 |

The Web implementation rejects computed Mach at or above 1. Android's calculations use the same subsonic formulas but do not apply an identical Mach-domain rejection in the main calculation. Neither product implements normal-shock Pitot relations.

## 6. Aircraft aerodynamics

### 6.1 Aircraft data and force conventions

A selected aircraft profile supplies \(S\), reference chord \(c\), an optional \(C_{L,\max}\) for **Flap 0 through Flap 13**, and optional mass choices **MTOW, MLW, MZFW, BOW, Heavy, Light**. All are values, not alternative mathematical models. Manual aircraft data use the same equations. The input commonly labeled Weight is entered in **mass units**:

```math
W=mg_0,\qquad L=N_ZW.
```

### 6.2 Lift coefficient, equivalent forces, and stall

The aerodynamic reference lift coefficient is:

```math
C_L=\frac{L}{qS}=\frac{N_Zmg_0}{qS}.
```

The reported reference force, actual lift, and pressure-normalized weight are numerically displayed in kgf:

```math
F_{\rm ref,kgf}=\frac{qS}{g_0},\qquad
L_{\rm kgf}=\frac{C_LqS}{g_0},\qquad
(W/\delta)_{\rm kgf}=\frac{m}{\delta}.
```

These expressions are numerical force-equivalent values in kgf, using \(g_0=9.80665\) m/s²; the last value is the weight force divided by pressure ratio \(\delta=p/p_0\), then by \(g_0\).

The **1-g stall reference TAS** is:

```math
V_{S,T}=\sqrt{\frac{2mg_0}{\rho S C_{L,\max}}}.
```

Convert this TAS through the local impact-pressure formula and the sea-level CAS formula to obtain the **displayed stall CAS** \(V_{S,C}\). It is *independent of the selected maneuver load factor*. A theoretical accelerated-stall TAS would scale by \(\sqrt{N_Z}\) for positive \(N_Z\), but that is not the displayed stall speed.

The reported VS Factor and corresponding input transformation are:

```math
F_V=\frac{V_C}{V_{S,C}},\qquad
V_{C,\rm target}=F_{V,\rm input}V_{S,C}+\Delta V_C.
```

The optional additive term \(\Delta V_C\) is in knots before conversion.

### 6.3 Reynolds number

With reference chord \(c\), Reynolds number compares inertia with viscous stress:

```math
Re=\frac{\rho V_T c}{\mu}.
```

Use the platform-specific viscosity of Section 4.

## 7. Maneuver loads and turning

The calculator supports independent **Pull-up \(N_Z\)**, **Turn \(N_Z\)**, and **Bank Angle \(\phi\)** inputs. In a steady coordinated *level turn*, the vertical component of lift balances weight:

```math
L\cos\phi=W,\qquad N_Z=\frac1{\cos\phi},\qquad
\phi=\arccos\left(\frac1{N_Z}\right).
```

Pull-up mode takes entered \(N_Z\) and sets bank to zero. Turn mode derives the **nonnegative** bank magnitude from \(N_Z\ge1\). Bank input derives load factor from the bank angle (degrees are converted to radians). The level-turn equations require \(\cos\phi>0\).

Steady **air-relative** turn radius and heading rate are:

```math
R_{\rm air}=\frac{V_T^2}{g_0\tan\phi},\qquad
\dot\psi=\frac{g_0\tan\phi}{V_T}.
```

The output radius is in **km**, and rate is converted from rad/s to the configured angular unit per second. Zero bank makes radius infinite or unavailable; zero TAS makes turn rate undefined. A steady wind translates the air-relative trajectory, so the ground path need not be circular. **Do not substitute ground speed for TAS.**

## 8. Wind and navigation

### 8.1 Horizontal model and aerodynamic sideslip convention

The calculator uses a local horizontal north-east plane with azimuths **clockwise from true north**. Let \(\mathbf e(\eta)=(\cos\eta,\sin\eta)\). Then:

```math
\mathbf V_g=\mathbf V_a+\mathbf V_w,\qquad
\mathbf V_a=V_T\mathbf e(\chi_a),\qquad
\mathbf V_g=GS\mathbf e(\chi).
```

\(\psi\) is the aircraft **heading**; \(\chi_a\) is the azimuth of its **velocity through the air**, not \(\alpha\) (angle of attack); \(\chi\) is ground track. The implemented two-dimensional angle relationships are:

```math
\beta_{\rm horiz}=\operatorname{wrap}(\chi_a-\psi),\qquad
d=\operatorname{wrap}(\psi-\chi).
```

The signed \(\beta_{\rm horiz}\) is positive for **relative wind coming from the aircraft's right**. Example: heading 000° and air-relative velocity azimuth 010° yield horizontal \(\beta=+10^\circ\). This is **not a general 3-D sideslip identity**: for an arbitrary attitude and vertical velocity, the standard aerodynamic sideslip angle is computed in body axes, for example \(\beta=\arcsin(v_{\rm body}/V_T)\). The implemented solver assumes a horizontal geometry.

### 8.2 Wind input modes and sign convention

Positive headwind \(HW\) means wind **from ahead** along the specified reference heading \(\chi_r\). Positive crosswind \(CW\) means wind **from the right**. The inertial wind-to vector uses north and east components:

```math
u_w=-HW\cos\chi_r+CW\sin\chi_r,\qquad
v_w=-CW\cos\chi_r-HW\sin\chi_r.
```

```math
V_w=\sqrt{HW^2+CW^2},\qquad
\psi_w=\operatorname{wrap}(\operatorname{atan2}(v_w,u_w)+\pi).
```

The 180° addition converts the vector's direction *toward* to the meteorological direction *from*. In **Wind Speed** input mode set \(HW=V_w,\ CW=0,\ \chi_r=\psi_w\). In headwind/crosswind input mode, \(\chi_r\) is the specified **Runway Angle**.

### 8.3 Ground speed and track known

For a known ground-speed vector:

```math
\mathbf V_g=GS\mathbf e(\chi),\qquad
\mathbf V_a=\mathbf V_g-\mathbf V_w,\qquad
V_T=\|\mathbf V_a\|,\qquad
\chi_a=\operatorname{atan2}(V_{a,E},V_{a,N}).
```

If heading and drift were entered instead of track, first use \(\chi=\psi-d\). If sideslip was entered, derive \(\psi=\chi_a-\beta\). Otherwise derive \(\beta=\operatorname{wrap}(\chi_a-\psi)\).

### 8.4 Ground speed, heading, and sideslip known

Heading and sideslip fix the air-relative direction \(\chi_a=\psi+\beta\), but not TAS. Let \(w_\parallel=\mathbf V_w\cdot\mathbf e(\chi_a)\). Squaring the wind triangle and selecting the implemented root gives:

```math
V_T=-w_\parallel+
\sqrt{w_\parallel^2+GS^2-V_w^2}.
```

A negative discriminant or a negative selected TAS is an infeasible input. This is a **quadratic solution**, not an iteration; alternative roots are not exhaustively enumerated.

### 8.5 TAS and heading/sideslip known

Use \(\chi_a=\psi+\beta\) and calculate:

```math
\mathbf V_a=V_T\mathbf e(\chi_a),\qquad
\mathbf V_g=\mathbf V_a+\mathbf V_w,\qquad
GS=\|\mathbf V_g\|,\qquad
\chi=\operatorname{atan2}(V_{g,E},V_{g,N}).
```

Recover drift with \(d=\operatorname{wrap}(\psi-\chi)\).

### 8.6 TAS and track known

The component of ground velocity **normal to track** must vanish. With:

```math
w_\perp=-u_w\sin\chi+v_w\cos\chi,\qquad
\chi_a=\chi+\arcsin(-w_\perp/V_T),
```

the implemented **principal inverse-trigonometric branch** requires \(|w_\perp/V_T|\le1\). It then reconstructs heading or sideslip and ground velocity as required. Other mathematical branches are not searched.

### 8.7 Wind components along the calculated track

The output headwind and crosswind are relative to the resulting **ground track**, not necessarily the input runway reference:

```math
HW_{\rm track}=V_w\cos(\psi_w-\chi),\qquad
CW_{\rm track}=V_w\sin(\psi_w-\chi).
```

Positive headwind is from ahead; positive crosswind is from the right. With zero wind, wind direction is undefined and the output is unavailable. Angle normalization adds or subtracts multiples of \(2\pi\), which is not numerical root finding.

## 9. Complete output coverage

The table maps the current **42 displayed output quantities** to the equations. Values are converted to the chosen display units after calculation.

| Output group | Computed outputs | Section |
|---|---|---|
| Altitudes | Pressure, geometric, geopotential, density, temperature | 3 |
| Atmospheric state | Pressure, density, temperature, Delta ISA, viscosity, sound speed | 2, 4 |
| Atmosphere ratios | Pressure ratio \(\delta\), density ratio \(\sigma\), temperature ratio \(\theta\) | 2 |
| Speeds | TAS, CAS, EAS, ground speed, stall speed, VS Factor, Mach | 5, 6, 8 |
| Aerodynamics | Lift coefficient, Reynolds, dynamic pressure, impact pressure, total pressure, total temperature | 5, 6 |
| Equivalent forces | \(qS/g_0\), lift force, \(W/\delta\) | 6 |
| Maneuver | Load factor, bank angle, turn radius, turn rate | 7 |
| Navigation | Track, heading, drift, horizontal sideslip, wind speed, wind direction, along-track headwind, along-track crosswind | 8 |

The mass/area/chord/flap inputs are required as applicable, but do not alter the governing formulas. Displayed **kgf** is the numerical force value in newtons divided by \(g_0\). Output rounding (including optional extra decimal digits) does not change the underlying SI solution.

## 10. Numerical methods and limits

| Task | Actual numerical method | Exit rule |
|---|---|---|
| \(H\to H_P\) | Bracketed Newton with finite-difference derivative and midpoint safeguard | \(|f|\le0.001\) m or 40 iterations; no-sign-change fallback returns \(H\) |
| \(\rho\to H_\rho\) | Bisection | Exactly 32 iterations or an endpoint clamp |
| \(p\to H_P\) | ISA layer selection and analytical inversion | Direct |
| ISA state, TAS/CAS/Mach/EAS, stall, maneuver | Closed-form formulas | Direct |
| Wind inverse | Vector operations, quadratic root, principal inverse trig branch | Direct |

A layer-lookup loop is not an iterative physical solver. Neither atmospheric root solver uses a relative stopping tolerance. Out-of-range density is **clamped** to the bisection interval. An unbracketed \(H\to H_P\) solution or exhausted Newton budget returns a value without verified convergence. These behaviors are part of the current code, not recommended numerical validation practice.

The standard ISA reference range is 0–84.852 km geopotential altitude, with lower-layer extrapolation to −5 km for numerical lookup. Absolute temperature, density, pressure, reference area, and other divisors must be physically admissible. The Pitot model is **subsonic**. Infeasible wind geometry requires rejection rather than an invented real-valued solution. Android and Web do not apply all validity checks identically.

## 11. Reproducibility and verification

| Check | Reference property |
|---|---|
| ISA sea level | \(T=288.15\) K, \(p=101325\) Pa, \(\rho\approx1.225\) kg/m³, \(a\approx340.294\) m/s |
| ISA tropopause at 11 km | \(T=216.65\) K, \(p\approx22632.04\) Pa |
| ISA input \(\Delta T=0\) | \(H=H_P\) and ISA density, within implementation rounding |
| ISA pressure inversion | \(H_P\to p\to H_P\) returns the original value within tolerance |
| EAS identity | \(\rho V_T^2=\rho_0V_E^2\) |
| Impact pressure conversion | TAS \(\to q_c\to\) CAS \(\to\) TAS recovers TAS for subsonic states |
| Aerodynamic force | \(C_LqS=N_Zmg_0\) |
| Stall speed | Reference 1-g stall CAS does not depend on maneuver load factor |
| Wind vector | \(\mathbf V_g-\mathbf V_w=\mathbf V_a\) |
| No wind | \(GS=V_T\), \(\chi=\chi_a\); zero sideslip additionally gives \(\chi=\psi\) |

For independent verification, use the physical cases in [reference_physics.py](../tools/reference_physics.py) and the repository's [tests](../tests/). For exact behavior, compare [Android B4A source](../AeroCalculator.b4a), [Web numerical core](../web/src/core.ts), and [Web input/output path](../web/src/main.ts). Input/output unit and sign conventions are also listed in [units_and_conventions.md](units_and_conventions.md).

Physical references include the [1976 U.S. Standard Atmosphere](https://ntrs.nasa.gov/citations/19770009539), NASA Glenn's [isentropic-flow equations](https://www.grc.nasa.gov/www/k-12/airplane/isentrop.html), and the [Flight Test Engineering Reference Handbook](https://society-of-flight-test-engineers.github.io/quarto-handbook/01-general.html). All constants and current software-specific approximations are reproduced above.
