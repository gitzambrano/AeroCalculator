# AeroCalculator

**AeroCalculator** is a comprehensive aeronautics and flight dynamics calculator for Android built with **Basic4android (B4A)**. Designed for aerospace engineers, pilots, and aviation enthusiasts, it provides high-precision atmospheric modeling, airspeed conversions, aerodynamic analysis, and aircraft profile management.

[![Get it on Google Play](https://img.shields.io/badge/Google_Play-AeroCalculator-green?logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=flightdyn.aerocalculator)

👉 **Google Play Store:** [Download AeroCalculator on Google Play](https://play.google.com/store/apps/details?id=flightdyn.aerocalculator)

---

## ✈️ Key Features

### 1. Atmosphere & Altitude Calculations
* **Standard Atmosphere (ISA)**: Temperature, pressure, and density profiles with altitude.
* **Altitude Conversions**: Geometric Altitude, Pressure Altitude ($H_p$), and Density Altitude ($H_d$).
* **Temperature Deviations**: Dynamic computation of $\Delta\text{ISA}$.
* **Device Sensor Integration**: Optional real-time barometric pressure and temperature readings from device sensors.

### 2. Airspeed & Compressibility
* Conversions between:
  * **IAS** (Indicated Airspeed)
  * **CAS** (Calibrated Airspeed)
  * **EAS** (Equivalent Airspeed)
  * **TAS** (True Airspeed)
  * **Mach Number ($M$)**
* Dynamic pressure ($q$) and impact pressure calculations.

### 3. Flight Dynamics & Aircraft Performance
* **Stall Speed Calculation**: Computation of $V_{\text{stall}}$ based on weight, wing reference area ($S_{\text{ref}}$), and $C_{L,\text{max}}$.
* **Maneuver & Turn Performance**: Load factor ($n_z$), bank angles, turn rate, and turn radius.
* **Wind Components**: Crosswind and headwind decomposition with customizable reference angles.

### 4. Airplane Profiles & Database Management
* Customizable aircraft parameters ($S_{\text{ref}}$, $c_{\text{ref}}$, $C_{L,\text{max}}$, weight limits).
* Built-in file and profile explorer for managing aircraft configuration files.

---

## 🛠️ Project Structure

```text
├── AeroCalculator.b4a         # Main B4A Project & UI Logic
├── Airp.bas                   # Aircraft Profile & Database Activity Module
├── ClsCheckList.bas           # Checklist Custom View / Class
├── ClsExplorer.bas            # File Explorer & Profile Picker Class
├── Files/                     # UI Assets, Icons, and Custom Fonts (Xenara)
├── Icons/                     # App launcher and graphic design assets
├── Install/                   # Required B4A third-party library packages
├── .gitignore                 # Protects keys, build binaries, and metadata
└── README.md                  # Project Documentation
```

---

## 🚀 Getting Started with B4A

### Prerequisites
* [Basic4android (B4A)](https://www.b4x.com/b4a.html) v13.0+
* Android SDK with Build Tools (Target SDK 34)
* Java JDK (OpenJDK 11 / 14 / 19 recommended for modern B4A)

### Included Libraries
Ensure the following B4A libraries are installed in your B4A Additional Libraries folder:
* `AHViewPager` (included in `Install/AHViewPager3_00.zip`)
* `RSPopupMenu` (included in `Install/RSPopupMenu.zip`)
* `RuntimePermissions`
* `GPS`, `IME`, `Phone`, `Animation`, `PreferenceActivity`, `Reflection`, `RichString`

### Compilation
1. Open `AeroCalculator.b4a` in the B4A IDE.
2. Select **Project** > **Compile & Run** (or press `F5`) for Debug mode.
3. For Release builds, configure your own signing key via **Tools** > **Private Sign Key**.

---

## 🔒 Security & Keystores

Signing keys (`*.keystore`, `*.pepk`, `.pem`), credential files, and build outputs (`Objects/`, `AutoBackups/`) are intentionally excluded via `.gitignore` to protect sensitive signing credentials.
