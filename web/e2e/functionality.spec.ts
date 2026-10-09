import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function fill(page: Page, id: string, value: string): Promise<void> {
  await page.locator(`#${id}`).fill(value);
}

async function select(page: Page, id: string, value: string): Promise<void> {
  await page.locator(`#${id}`).selectOption(value);
}

async function resultText(page: Page, name: string): Promise<string> {
  return (await page.locator(`[data-result="${name}"]`).textContent())?.trim() ?? "";
}

async function setupBaseline(page: Page): Promise<void> {
  await page.goto("/");
  await select(page, "temp-type", "Δ ISA");
  await fill(page, "temp-value", "0");
  await fill(page, "alt-value", "10000");
  await fill(page, "weight-value", "10000");
  await fill(page, "sref-value", "30");
  await fill(page, "cref-value", "2");
  await fill(page, "clmax-value", "1.5");
  await fill(page, "nz-value", "1");
  await fill(page, "angle1-value", "0");
  await fill(page, "angle2-value", "0");
  await fill(page, "headWind-value", "0");
  await fill(page, "crossWind-value", "0");
  await fill(page, "windRef-value", "0");
}

async function selectSetting(page: Page, id: string, value: string): Promise<void> {
  const selectEl = page.locator("#" + id);
  const label = await selectEl.evaluate((el, selectedValue) => {
    const select = el as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value === selectedValue)?.text ?? selectedValue;
  }, value);
  await page.locator(`[data-setting-select="${id}"]`).click();
  await page.locator("#options-selector-list .option-item").filter({ hasText: label }).first().click();
  await expect(selectEl).toHaveValue(value);
}

test("aircraft editor unit modal uses the standard themed picker above fullscreen dialog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add airplane" }).click();
  await page.locator("#profile-sref").fill("10");

  const dialog = page.locator("#profile-editor");
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(Math.abs(bounds!.x)).toBeLessThan(1.5);
  expect(Math.abs(bounds!.y)).toBeLessThan(1.5);
  expect(Math.abs(bounds!.width - viewport.width)).toBeLessThan(1.5);
  expect(Math.abs(bounds!.height - viewport.height)).toBeLessThan(1.5);

  await page.locator('[data-profile-unit="profile-sref-unit"]').click();
  const selector = page.locator("#modal-options-selector");
  await expect(selector).toHaveClass(/open/);
  await expect(page.locator("#options-selector-title")).toHaveText("Wing Area Unit");
  await expect(dialog.locator("#modal-options-selector")).toHaveCount(1);
  await page.locator("#options-selector-list .option-item").filter({ hasText: "Square feet" }).click();
  await expect(page.locator("#profile-sref-unit")).toHaveValue("ft²");
  expect(Number(await page.locator("#profile-sref").inputValue())).toBeCloseTo(107.639104167, 7);
  await expect(page.locator('[data-profile-unit="profile-sref-unit"]')).toHaveText("ft²");

  await page.locator('[data-profile-unit="profile-cref-unit"]').click();
  await expect(page.locator("#options-selector-title")).toHaveText("Chord Unit");
  await page.locator("#options-selector-cancel").click();

  await page.locator('[data-profile-unit="profile-weight-unit"]').click();
  await expect(page.locator("#options-selector-title")).toHaveText("Mass Unit");
  await page.locator("#options-selector-list .option-item").filter({ hasText: "Pound — US aviation" }).click();
  await expect(page.locator("#profile-weight-unit")).toHaveValue("lb");

  const icons = await page.locator("#add-flap img, #remove-flap img").evaluateAll((list) =>
    list.map((img) => ({
      ready: (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
      width: img.getBoundingClientRect().width,
      height: img.getBoundingClientRect().height,
    }))
  );
  expect(icons).toHaveLength(2);
  for (const icon of icons) {
    expect(icon.ready).toBe(true);
    expect(icon.width).toBe(34);
    expect(icon.height).toBe(34);
  }
});

test("custom airplane and About follow the current theme and APK version", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#airplane-select-button")).toContainText("Custom Airplane");
  // The selected aircraft must have the exact same field colors as the
  // middle numeric column in EVERY light and dark theme.
  await page.addStyleTag({ content: "* { transition: none !important; }" });
  for (const theme of ["Green Peace", "Ancient Brown", "Dark Shadows", "Blue Sky", "Red Alert", "Orange Juice"]) {
    const colors = await page.evaluate((name) => {
      document.documentElement.dataset.theme = name;
      const selectedAircraft = getComputedStyle(document.querySelector("#airplane-select-button")!);
      const numericValue = getComputedStyle(document.querySelector("#alt-value")!);
      return {
        selected: {
          background: selectedAircraft.backgroundColor,
          text: selectedAircraft.color,
          border: selectedAircraft.borderTopColor,
        },
        center: {
          background: numericValue.backgroundColor,
          text: numericValue.color,
          border: numericValue.borderTopColor,
        },
      };
    }, theme);
    expect(colors.selected, theme).toEqual(colors.center);
  }
  await page.locator("#more-menu").click();
  await page.locator('[data-menu="about"]').click();
  await expect(page.locator("#about-dialog")).toBeVisible();
  await expect(page.locator("#about-version")).toHaveText(/\d{4} \/ version 3\.37/);
  await expect(page.locator("#about-dialog")).toContainText("Gustavo José Zambrano");
  await expect(page.locator("#about-dialog")).toContainText("flightdyn@gmail.com");
});

test("selected aircraft follows numeric field colors on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.addStyleTag({ content: "* { transition: none !important; }" });
  for (const theme of ["Green Peace", "Ancient Brown", "Dark Shadows", "Blue Sky", "Red Alert", "Orange Juice"]) {
    const values = await page.evaluate((name) => {
      document.documentElement.dataset.theme = name;
      const a = getComputedStyle(document.querySelector("#airplane-select-button")!);
      const center = getComputedStyle(document.querySelector("#alt-value")!);
      return {
        aircraft: [a.backgroundColor, a.color, a.borderTopColor],
        center: [center.backgroundColor, center.color, center.borderTopColor],
      };
    }, theme);
    expect(values.aircraft, theme).toEqual(values.center);
  }
});

test.describe("mobile input unit tap vs horizontal swipe", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("tap alone opens a modal, drag alone switches tab", async ({ page }) => {
    await page.goto("/");
    const trigger = page.locator("#alt-unit-trigger");
    await trigger.tap();
    await expect(page.locator("#modal-options-selector")).toHaveClass(/open/);
    await page.locator("#options-selector-cancel").tap();

    const state = await page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>("#alt-unit-trigger")!;
      const pointer = (type: string, x: number, y: number) => btn.dispatchEvent(
        new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 900, isPrimary: true, pointerType: "touch", clientX: x, clientY: y })
      );
      pointer("pointerdown", 340, 380);
      pointer("pointermove", 270, 380);
      pointer("pointermove", 160, 380);
      pointer("pointerup", 160, 380);
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return {
        tab: document.querySelector<HTMLButtonElement>('.tab[aria-selected="true"]')?.dataset.page,
        modal: document.querySelector("#modal-options-selector")?.classList.contains("open"),
      };
    });
    expect(state.tab).toBe("airplanes");
    expect(state.modal).toBe(false);
  });
});

test("3.37 technical help keeps the concise definition, equation and unit only", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "CALCULATE" }).click();

  await page.locator('.result-row[data-name="DynPressure * S / g"]').click();
  await expect(page.locator("#modal-result-tooltip")).toHaveClass(/open/);
  await expect(page.locator("#result-tooltip-desc")).toHaveText(
    "Aerodynamic reference force qS for a unit lift coefficient (CL = 1), expressed in kilogram-force (kgf). Nonnegative."
  );
  await expect(page.locator("#result-tooltip-eq-box")).toBeVisible();
  await expect(page.locator("#result-tooltip-unit-text")).toHaveText("kgf");
  await expect(page.locator("#modal-result-tooltip")).not.toContainText("Model Physics");
  await page.locator("#btn-result-tooltip-ok").click();

  await page.locator('.result-row[data-name="Weight/Delta W/δ"]').click();
  await expect(page.locator("#result-tooltip-desc")).toHaveText(
    "Aircraft weight divided by atmospheric pressure ratio δ, expressed in kilogram-force (kgf). Positive for positive aircraft weight."
  );
  await expect(page.locator("#modal-result-tooltip")).not.toContainText("Model Physics");
});

test("unit dropdown opens by real click and converts the represented value", async ({ page }) => {
  await page.goto("/");
  await fill(page, "alt-value", "1000");

  await page.locator("#alt-unit-trigger").click();
  await expect(page.locator("#modal-options-selector")).toHaveClass(/open/);
  await expect(page.locator("#options-selector-title")).toHaveText("Altitude Unit");
  await page.locator("#options-selector-list .option-item").filter({ hasText: "Meters — SI unit" }).click();
  await expect(page.locator("#alt-unit")).toHaveValue("m");
  expect(Number(await page.locator("#alt-value").inputValue())).toBeCloseTo(304.8, 6);
  await expect(page.locator("#modal-options-selector")).not.toHaveClass(/open/);

  await fill(page, "spd-value", "100");
  await page.locator("#spd-unit-trigger").click();
  await expect(page.locator("#options-selector-title")).toHaveText("Speed Unit");
  await page.locator("#options-selector-list .option-item").filter({ hasText: "Meters per second" }).click();
  await expect(page.locator("#spd-unit")).toHaveValue("m/s");
  expect(Number(await page.locator("#spd-value").inputValue())).toBeCloseTo(51.444444444, 6);

  // The unit picker must update when the quantity changes to one without units.
  await page.locator("#spd-type").selectOption("Mach");
  await expect(page.locator("#spd-unit-trigger")).toBeDisabled();
  await page.locator("#spd-type").selectOption("TAS");
  await expect(page.locator("#spd-unit-trigger")).toBeEnabled();
  await page.locator("#spd-unit-trigger").click();
  await expect(page.locator("#options-selector-title")).toHaveText("Speed Unit");
});

test("keyboard activates the unit picker and long press opens help without the picker", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("#alt-unit-trigger");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#modal-options-selector")).toHaveClass(/open/);
  await page.locator("#options-selector-list .option-item").filter({ hasText: "Meters — SI unit" }).click();

  const bounds = await trigger.boundingBox();
  if (!bounds) throw new Error("Unit trigger is not visible");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await expect(page.locator("#modal-result-tooltip")).toHaveClass(/open/, { timeout: 2000 });
  await page.mouse.up();
  await expect(page.locator("#modal-options-selector")).not.toHaveClass(/open/);
});

test.describe("mobile unit selector", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test("tap opens the themed unit sheet and changes the temperature unit", async ({ page }) => {
    await page.goto("/");
    await fill(page, "temp-value", "15");
    await page.locator("#temp-unit-trigger").tap();
    await expect(page.locator("#modal-options-selector")).toHaveClass(/open/);
    await expect(page.locator("#options-selector-title")).toHaveText("Temperature Unit");
    await page.locator("#options-selector-list .option-item").filter({ hasText: "Degrees Fahrenheit" }).tap();
    await expect(page.locator("#temp-unit")).toHaveValue("°F");
    expect(Number(await page.locator("#temp-value").inputValue())).toBeCloseTo(59, 5);
    await expect(page.locator("#modal-options-selector")).not.toHaveClass(/open/);
  });
});

test("offline PWA reload preserves the latest cached calculator shell", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) throw new Error("Service workers unavailable");
    await navigator.serviceWorker.ready;
    // Wait for the worker to take control before testing an offline navigation.
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true })
      );
    }
  });
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator("#alt-unit-trigger")).toBeVisible();
    await page.locator("#alt-unit-trigger").click();
    await expect(page.locator("#modal-options-selector")).toHaveClass(/open/);
  } finally {
    await context.setOffline(false);
  }
});

test("changing input units preserves the represented physical state", async ({ page }) => {
  await page.goto("/");

  await fill(page, "alt-value", "1000");
  await select(page, "alt-unit", "m");
  expect(Number(await page.locator("#alt-value").inputValue())).toBeCloseTo(304.8, 6);

  await fill(page, "spd-value", "100");
  await select(page, "spd-unit", "m/s");
  expect(Number(await page.locator("#spd-value").inputValue())).toBeCloseTo(51.444444444, 6);

  await fill(page, "temp-value", "15");
  await select(page, "temp-unit", "°F");
  expect(Number(await page.locator("#temp-value").inputValue())).toBeCloseTo(59, 6);

  await fill(page, "angle1-value", "180");
  await select(page, "angle1-unit", "rad");
  expect(Number(await page.locator("#angle1-value").inputValue())).toBeCloseTo(Math.PI, 6);

  await fill(page, "sref-value", "1");
  await select(page, "sref-unit", "ft²");
  await expect(page.locator("#sref-value")).toHaveValue("10.76391");
  await select(page, "sref-unit", "in²");
  await expect(page.locator("#sref-value")).toHaveValue("1550.003");
  expect(Number(await page.locator("#sref-value").inputValue())).toBeCloseTo(1550.0031, 3);
});

test("changing a physical input type clears incompatible retained values", async ({ page }) => {
  await page.goto("/");
  await fill(page, "alt-value", "1000");
  await select(page, "alt-type", "P");
  await expect(page.locator("#alt-value")).toHaveValue("");
  await expect(page.locator("#alt-unit")).toHaveValue("mbar");

  await fill(page, "spd-value", "100");
  await select(page, "spd-type", "Mach");
  await expect(page.locator("#spd-value")).toHaveValue("");

  await fill(page, "headWind-value", "10");
  await fill(page, "crossWind-value", "5");
  await fill(page, "windRef-value", "20");
  await select(page, "headWind-type", "Wind Speed");
  await expect(page.locator("#headWind-value")).toHaveValue("");
  await expect(page.locator("#crossWind-value")).toHaveValue("");
  await expect(page.locator("#windRef-value")).toHaveValue("");
});

test("all non-sensor speed input modes produce a valid TAS", async ({ page }) => {
  await setupBaseline(page);

  const cases = [
    { type: "TAS", value: "200", unit: "kt" },
    { type: "CAS", value: "180", unit: "kt" },
    { type: "EAS", value: "170", unit: "kt" },
    { type: "Mach", value: "0.4" },
    { type: "CL", value: "0.5" },
    { type: "Vs Factor", value: "1.5" },
    { type: "Ground Speed", value: "180", unit: "kt" },
    { type: "Qdyn", value: "4000", unit: "Pa" },
    { type: "Qc", value: "5000", unit: "Pa" },
  ] as const;

  for (const item of cases) {
    await select(page, "spd-type", item.type);
    if (item.unit) await select(page, "spd-unit", item.unit);
    await fill(page, "spd-value", item.value);
    if (item.type === "Vs Factor") {
      await expect(page.locator("#spdDelta-label")).toBeVisible();
      await expect(page.locator("#spd-unit")).toBeHidden();
      await fill(page, "spdDelta-value", "10");
    }
    expect(await resultText(page, "True Airspeed"), item.type).not.toBe("----");
    await expect(page.locator("#calc-status")).toBeHidden();
  }
});

test("altitude, temperature and maneuver modes are wired correctly", async ({ page }) => {
  await setupBaseline(page);
  await select(page, "spd-type", "TAS");
  await fill(page, "spd-value", "180");

  for (const item of [
    { type: "Hp", unit: "ft", value: "10000" },
    { type: "Hg", unit: "ft", value: "10000" },
    { type: "P", unit: "hPa", value: "700" },
  ]) {
    await select(page, "alt-type", item.type);
    await select(page, "alt-unit", item.unit);
    await fill(page, "alt-value", item.value);
    expect(await resultText(page, "Pressure Altitude"), item.type).not.toBe("----");
  }

  await select(page, "alt-type", "Hp");
  await select(page, "alt-unit", "ft");
  await fill(page, "alt-value", "10000");

  await select(page, "temp-type", "OAT");
  await fill(page, "temp-value", "5");
  expect(await resultText(page, "Density")).not.toBe("----");
  await select(page, "temp-type", "Δ ISA");
  await fill(page, "temp-value", "10");
  expect(await resultText(page, "Density")).not.toBe("----");

  await select(page, "nz-type", "NzPullup");
  await fill(page, "nz-value", "-0.5");
  expect(await resultText(page, "Load Factor Nz")).toContain("-0.50");

  await select(page, "nz-type", "NzTurn");
  await fill(page, "nz-value", "2");
  // Output angles default to degrees.
  expect(Number.parseFloat(await resultText(page, "Bank Angle φ"))).toBeCloseTo(60, 2);

  await select(page, "nz-type", "BankTurn");
  await fill(page, "nz-value", "60");
  expect(Number.parseFloat(await resultText(page, "Load Factor Nz"))).toBeCloseTo(2, 2);
});

test("both wind input modes and angle combinations remain solvable", async ({ page }) => {
  await setupBaseline(page);
  await select(page, "spd-type", "TAS");
  await fill(page, "spd-value", "100");

  await fill(page, "headWind-value", "20");
  await fill(page, "crossWind-value", "10");
  await fill(page, "windRef-value", "0");
  expect(Number.parseFloat(await resultText(page, "Wind Speed"))).toBeCloseTo(Math.hypot(20, 10), 1);
  expect(await resultText(page, "Ground Speed")).not.toBe("----");

  await select(page, "headWind-type", "Wind Speed");
  await expect(page.locator('[data-field="crossWind"]')).toBeHidden();
  await fill(page, "headWind-value", "20");
  await fill(page, "windRef-value", "90");
  expect(Number.parseFloat(await resultText(page, "Wind Speed"))).toBeCloseTo(20, 1);

  await select(page, "headWind-type", "HeadWind");
  await fill(page, "headWind-value", "0");
  await fill(page, "crossWind-value", "0");
  await fill(page, "windRef-value", "0");

  for (const angle1 of ["Track", "Heading"] as const) {
    for (const angle2 of ["Sideslip", "Drift"] as const) {
      await select(page, "angle1-type", angle1);
      await fill(page, "angle1-value", "10");
      await select(page, "angle2-type", angle2);
      await fill(page, "angle2-value", "2");
      expect(await resultText(page, "Ground Speed"), `${angle1}/${angle2}`).not.toBe("----");
      expect(await resultText(page, "Track Angle"), `${angle1}/${angle2}`).not.toBe("----");
      expect(await resultText(page, "Heading Angle Ψ"), `${angle1}/${angle2}`).not.toBe("----");
    }
  }
});

test("fresh output angles use degrees and zero wind has no direction", async ({ page }) => {
  await setupBaseline(page);
  await select(page, "spd-type", "TAS");
  await fill(page, "spd-value", "100");

  // A first run shows output angles in degrees, like the input defaults.
  await expect(page.locator('[data-result="Bank Angle φ"]')).toHaveText(/deg$/);

  // UI-1: wind direction is undefined without wind and shows as unavailable.
  expect(await resultText(page, "Wind Speed")).toMatch(/^0\.00 /);
  expect(await resultText(page, "Wind Direction")).toBe("----");

  await fill(page, "headWind-value", "10");
  await expect(page.locator('[data-result="Wind Direction"]')).toHaveText(/deg$/);
});

test("output settings change formatting without changing the calculation", async ({ page }) => {
  await setupBaseline(page);
  await select(page, "spd-type", "TAS");
  await fill(page, "spd-value", "100");
  const machBefore = await resultText(page, "Mach");

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await selectSetting(page, "setting-speed", "m/s");
  await selectSetting(page, "setting-angle", "deg");
  await page.locator("#settings-form").getByRole("button", { name: "Save" }).click();

  expect(await resultText(page, "True Airspeed")).toContain("m/s");
  expect(await resultText(page, "Bank Angle φ")).toContain("deg");
  expect(await resultText(page, "Mach")).toBe(machBefore);

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await selectSetting(page, "setting-number-format", "+1 decimal");
  await page.locator("#settings-form").getByRole("button", { name: "Save" }).click();
  const machWithExtraDigit = Number(await resultText(page, "Mach"));
  expect(machWithExtraDigit).toBeCloseTo(Number(machBefore), 3);
});

test("aircraft profile create, select and Android-compatible export work end to end", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add airplane" }).click();
  await fill(page, "profile-name", "Test Jet");
  await fill(page, "profile-sref", "42");
  await fill(page, "profile-cref", "3");
  await fill(page, "profile-weight-MTOW", "12000");
  await page.locator("#add-flap").click();
  await fill(page, "profile-flap-0", "1.6");
  await page.locator("#profile-save").click();

  await expect(page.locator(".airplane-name-button strong")).toHaveText("Test Jet");
  await expect(page.locator(".airplane-meta")).toHaveText("42 m² · 12000 kg");
  await page.locator(".airplane-name-button").click();
  await page.locator("#airplane-select-button").click();
  const profileOption = page.locator("#options-selector-list .option-item").filter({ hasText: "Test Jet" });
  await expect(profileOption.locator(".option-desc")).toHaveText("42 m² · 12000 kg");
  await profileOption.click();
  await expect(page.locator("#airplane-select")).toHaveValue(/.+/);
  await expect(page.locator("#sref-value")).toHaveValue("42");
  await select(page, "weight-type", "MTOW");
  await expect(page.locator("#weight-value")).toHaveValue("12000");
  await expect(page.locator("#clmax-type option")).toHaveCount(2);
  // A newly selected profile starts from its first stored flap instead of the custom CL,MAX.
  await expect(page.locator('[data-field="clmax"] .field-select-display')).toContainText("Flap 0");
  await select(page, "clmax-type", "CLmax");
  await expect(page.locator('[data-field="clmax"] .field-select-display')).toHaveText("CL,MAX");
  await select(page, "clmax-type", "Flap 0");
  await expect(page.locator('[data-field="clmax"] .field-select-display')).toContainText("Flap 0");
  await expect(page.locator("#clmax-value")).toHaveValue("1.6");

  await page.getByRole("button", { name: "AIRPLANES" }).click();
  await page.locator(".airplane-edit-button").click();
  await expect(page.locator("[data-flap-row]:visible")).toHaveCount(1);
  await expect(page.locator("#profile-flap-1")).toHaveValue("");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "INPUTS" }).click();

  await page.getByRole("button", { name: "More options" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Airplanes" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("airplanes.txt");
  const path = await download.path();
  expect(path).not.toBeNull();
  const content = await readFile(path!, "utf8");
  expect(content).toContain("N=1");
  expect(content).toContain("1_Name=Test Jet");
  expect(content).toContain("1_W1=12000");
  expect(content).toContain("1_F0=1.6");
});

test("aircraft can be duplicated, reordered by drag and exported in the persisted order", async ({ page }) => {
  await page.goto("/");

  const createAircraft = async (name: string, sref: string): Promise<void> => {
    await page.getByRole("button", { name: "Add airplane" }).click();
    await fill(page, "profile-name", name);
    await fill(page, "profile-sref", sref);
    await fill(page, "profile-cref", "2");
    await page.locator("#profile-save").click();
  };

  await createAircraft("Alpha", "10");
  await createAircraft("Bravo", "20");

  const names = page.locator(".airplane-name-button strong");
  await expect(names).toHaveText(["Alpha", "Bravo"]);

  await page.getByRole("button", { name: "Duplicate Alpha" }).click();
  await expect(names).toHaveText(["Alpha", "Alpha Copy", "Bravo"]);
  await expect(page.locator("#airplane-select")).toHaveValue(/.+/);

  const bravoRow = page.locator(".airplane-list-row").filter({
    has: page.locator(".airplane-name-button strong").filter({ hasText: /^Bravo$/ }),
  });
  const alphaRow = page.locator(".airplane-list-row").filter({
    has: page.locator(".airplane-name-button strong").filter({ hasText: /^Alpha$/ }),
  });

  await bravoRow.dragTo(alphaRow, {
    targetPosition: { x: 20, y: 2 },
  });

  await expect(names).toHaveText(["Bravo", "Alpha", "Alpha Copy"]);

  await page.reload();
  await page.getByRole("button", { name: "AIRPLANES" }).click();
  await expect(names).toHaveText(["Bravo", "Alpha", "Alpha Copy"]);

  await page.getByRole("button", { name: "More options" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Airplanes" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const content = await readFile(path!, "utf8");
  expect(content).toContain("N=3");
  expect(content).toContain("1_Name=Bravo");
  expect(content).toContain("2_Name=Alpha");
  expect(content).toContain("3_Name=Alpha Copy");
});

test("Android airplanes.txt can be imported through the browser UI", async ({ page }) => {
  await page.goto("/");
  const content = [
    "N=1",
    "1_Name=Imported Jet",
    "1_S=50",
    "1_c=4",
    "1_W1=15000",
    "1_F0=1.7",
    "1_Sunit=0",
    "1_cunit=0",
    "1_Wunit=0",
  ].join("\n");

  await page.locator("#profile-import").setInputFiles({
    name: "airplanes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(content),
  });

  await expect(page.locator(".airplane-name-button strong")).toHaveText("Imported Jet");

  await page.locator("#profile-import").setInputFiles({
    name: "airplanes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(content),
  });
  await expect(page.locator(".airplane-name-button strong")).toHaveCount(2);
  await expect(page.locator(".airplane-name-button strong").nth(0)).toHaveText("Imported Jet");
  await expect(page.locator(".airplane-name-button strong").nth(1)).toHaveText("Imported Jet");
});

test("installed PWA remains usable offline after the first load", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.locator("html").getAttribute("data-offline-ready"), { timeout: 10000 }).toBe("true");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.locator(".input-row")).toHaveCount(14);
});


test("fresh installs start with zero saved airplanes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "AIRPLANES", exact: true }).click();
  await expect(page.locator(".airplane-list-row")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "AIRPLANES", exact: true }).click();
  await expect(page.locator(".airplane-list-row")).toHaveCount(0);
});

test("selecting an airplane starts from its first weight and flap", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add airplane" }).click();
  await fill(page, "profile-name", "Auto Jet");
  await fill(page, "profile-sref", "40");
  await fill(page, "profile-cref", "3");
  await fill(page, "profile-weight-MLW", "9000");
  await page.locator("#add-flap").click();
  await fill(page, "profile-flap-0", "1.7");
  await page.locator("#profile-save").click();
  await page.getByRole("button", { name: "INPUTS" }).click();
  await expect(page.locator("#weight-type")).toHaveValue("MLW");
  await expect(page.locator("#weight-value")).toHaveValue("9000");
  await expect(page.locator("#clmax-type")).toHaveValue("Flap 0");
  await expect(page.locator("#clmax-value")).toHaveValue("1.7");
});

test("airplane editor fills the viewport and unit changes preserve geometry and all six weights", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add airplane" }).click();
  const editor = page.locator("#profile-editor");
  await expect(editor).toBeVisible();
  const fullSize = await editor.evaluate((el) => {
    const bounds = el.getBoundingClientRect();
    return {
      x: bounds.x, y: bounds.y,
      width: bounds.width, height: bounds.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(Math.abs(fullSize.x)).toBeLessThan(1.5);
  expect(Math.abs(fullSize.y)).toBeLessThan(1.5);
  expect(Math.abs(fullSize.width - fullSize.viewportWidth)).toBeLessThan(1.5);
  expect(Math.abs(fullSize.height - fullSize.viewportHeight)).toBeLessThan(1.5);

  await fill(page, "profile-sref", "10");
  await fill(page, "profile-cref", "2");
  await fill(page, "profile-weight-MTOW", "10000");
  await fill(page, "profile-weight-MLW", "9000");
  await fill(page, "profile-weight-MZFW", "8000");
  await fill(page, "profile-weight-BOW", "7000");
  await fill(page, "profile-weight-Heavy", "6000");
  // Light intentionally blank and must remain blank when the unit changes.

  await page.locator("#profile-sref-unit").selectOption("ft²");
  expect(Number(await page.locator("#profile-sref").inputValue())).toBeCloseTo(107.639104167, 7);
  await page.locator("#profile-cref-unit").selectOption("ft");
  expect(Number(await page.locator("#profile-cref").inputValue())).toBeCloseTo(6.56167979003, 7);
  await page.locator("#profile-weight-unit").selectOption("lb");
  for (const [key, value] of [
    ["MTOW", 10000], ["MLW", 9000], ["MZFW", 8000], ["BOW", 7000], ["Heavy", 6000],
  ] as const) {
    expect(Number(await page.locator(`#profile-weight-${key}`).inputValue()))
      .toBeCloseTo(value / 0.45359237, 6);
  }
  await expect(page.locator("#profile-weight-Light")).toHaveValue("");

  // A round trip should preserve the physical value without cumulative rounding.
  await page.locator("#profile-sref-unit").selectOption("m²");
  await page.locator("#profile-cref-unit").selectOption("m");
  await page.locator("#profile-weight-unit").selectOption("kg");
  expect(Number(await page.locator("#profile-sref").inputValue())).toBeCloseTo(10, 8);
  expect(Number(await page.locator("#profile-cref").inputValue())).toBeCloseTo(2, 8);
  expect(Number(await page.locator("#profile-weight-MTOW").inputValue())).toBeCloseTo(10000, 7);
});

test.describe("mobile airplane editor and input swipes", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test("airplane editor is truly full-screen on a phone with working unit conversions", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add airplane" }).tap();
    const box = await page.locator("#profile-editor").boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.x)).toBeLessThan(1.5);
    expect(Math.abs(box!.y)).toBeLessThan(1.5);
    expect(Math.abs(box!.width - 375)).toBeLessThan(1.5);
    expect(Math.abs(box!.height - 812)).toBeLessThan(1.5);

    await fill(page, "profile-sref", "1");
    await page.locator("#profile-sref-unit").selectOption("in²");
    expect(Number(await page.locator("#profile-sref").inputValue())).toBeCloseTo(1550.003100006, 6);
    await expect(page.locator("#profile-save")).toBeVisible();
  });

  test("horizontal swipe across a unit button switches tabs without activating its dropdown", async ({ page }) => {
    await page.goto("/");
    const outcome = await page.evaluate(() => {
      const trigger = document.querySelector<HTMLElement>("#alt-unit-trigger");
      if (!trigger) throw new Error("Unit trigger missing");
      const send = (type: string, x: number, y: number) =>
        trigger.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerType: "touch",
          pointerId: 42, isPrimary: true, clientX: x, clientY: y,
        }));
      send("pointerdown", 300, 350);
      send("pointermove", 238, 350);
      send("pointermove", 184, 350);
      send("pointerup", 184, 350);
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return {
        currentPage: document.querySelector<HTMLButtonElement>('.tab[aria-selected="true"]')?.dataset.page,
        unitModalOpen: document.querySelector("#modal-options-selector")?.classList.contains("open"),
        helpOpen: document.querySelector("#modal-result-tooltip")?.classList.contains("open"),
      };
    });
    expect(outcome.currentPage).toBe("airplanes");
    expect(outcome.unitModalOpen).toBe(false);
    expect(outcome.helpOpen).toBe(false);

    // The next intentional tap must work immediately, not be swallowed by swipe filtering.
    await page.getByRole("button", { name: "INPUTS", exact: true }).tap();
    await page.locator("#alt-unit-trigger").tap();
    await expect(page.locator("#modal-options-selector")).toHaveClass(/open/);
  });
});

test("editor cancel asks before discarding only when something changed", async ({ page }) => {
  await page.goto("/");
  let dialogs = 0;
  page.on("dialog", (dialog) => { dialogs += 1; void dialog.accept(); });
  await page.getByRole("button", { name: "Add airplane" }).click();
  await page.locator("#profile-cancel").click();
  await expect(page.locator("#profile-editor")).not.toBeVisible();
  expect(dialogs).toBe(0);

  await page.getByRole("button", { name: "Add airplane" }).click();
  await fill(page, "profile-name", "Draft");
  await page.locator("#profile-cancel").click();
  await expect(page.locator("#profile-editor")).not.toBeVisible();
  expect(dialogs).toBe(1);
});
