import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const lengthUnits = ["ft", "m", "km", "nm", "mi", "in"];
const pressureUnits = ["mbar", "Pa", "hPa", "atm", "mmHg", "psi"];
const temperatureUnits = ["°C", "°F", "K"];
const speedUnits = ["kt", "m/s", "km/h", "mph", "ft/s"];
const massUnits = ["kg", "lb", "ton", "slug", "oz"];
const areaUnits = ["m²", "ft²", "in²", "cm²", "mm²"];
const chordUnits = ["m", "ft", "in", "cm", "mm"];
const angleUnits = ["deg", "rad"];
const themes = ["Green Peace", "Ancient Brown", "Dark Shadows", "Blue Sky", "Red Alert", "Orange Juice"];

async function fresh(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function fill(page: Page, id: string, value: string): Promise<void> {
  await page.locator("#" + id).fill(value);
}

async function select(page: Page, id: string, value: string): Promise<void> {
  await page.locator("#" + id).selectOption(value);
  await expect(page.locator("#" + id)).toHaveValue(value);
}

async function validBaseline(page: Page): Promise<void> {
  await fresh(page);
  await fill(page, "alt-value", "10000");
  await select(page, "temp-type", "Δ ISA");
  await fill(page, "temp-value", "0");
  await select(page, "spd-type", "TAS");
  await fill(page, "spd-value", "180");
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
  await expect(page.locator("#calc-status")).toBeHidden();
}

async function cycle(locator: Locator, values: readonly string[]): Promise<void> {
  for (const value of values) {
    await locator.selectOption(value);
    await expect(locator).toHaveValue(value);
  }
}

async function openSettings(page: Page): Promise<void> {
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("#settings-dialog")).toBeVisible();
}

async function saveSettings(page: Page): Promise<void> {
  await page.locator("#settings-form").getByRole("button", { name: "Save" }).click();
  await expect(page.locator("#settings-dialog")).toBeHidden();
}

test("every visible control and label has a usable accessible identity", async ({ page }) => {
  await validBaseline(page);

  const auditVisibleControls = async (): Promise<void> => {
    const failures = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll<HTMLElement>("button, a, select, input")];
      return nodes
        .filter((el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && !el.hasAttribute("hidden") && rect.width > 0 && rect.height > 0;
        })
        .filter((el) => {
          const label = el.closest("label")?.textContent?.trim() ?? "";
          const explicitLabel = el.id ? document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)?.textContent?.trim() ?? "" : "";
          const ownText = el.tagName === "INPUT" ? "" : el.textContent?.trim() ?? "";
          const placeholder = el instanceof HTMLInputElement ? el.placeholder.trim() : "";
          return !(el.getAttribute("aria-label")?.trim() || label || explicitLabel || ownText || placeholder || el.getAttribute("title")?.trim());
        })
        .map((el) => ({ tag: el.tagName, id: el.id, className: el.className }));
    });
    expect(failures).toEqual([]);
  };

  await auditVisibleControls();

  await page.getByRole("button", { name: "Add airplane" }).click();
  for (let i = 0; i < 14; i += 1) await page.getByRole("button", { name: "Add flap CLmax" }).click();
  await expect(page.locator("[data-flap-row]:visible")).toHaveCount(14);
  await auditVisibleControls();

  const emptyLabels = await page.locator("#profile-editor label:visible").evaluateAll((labels) =>
    labels.filter((label) => !(label.textContent ?? "").trim()).length
  );
  expect(emptyLabels).toBe(0);
  await page.getByRole("button", { name: "Cancel" }).click();

  await openSettings(page);
  await auditVisibleControls();
  const settingLabels = await page.locator("#settings-dialog label:visible").allTextContents();
  expect(settingLabels.every((text) => text.trim().length > 0)).toBe(true);
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "CALCULATE" }).click();
  const names = await page.locator(".result-name").allTextContents();
  expect(names).toHaveLength(42);
  expect(new Set(names).size).toBe(42);
  expect(names.every((name) => name.trim().length > 0)).toBe(true);
});

test("all top-level navigation and menu controls work", async ({ page }) => {
  await validBaseline(page);

  for (const [tab, pageId] of [["AIRPLANES", "page-airplanes"], ["INPUTS", "page-inputs"], ["CALCULATE", "page-calculate"]] as const) {
    await page.getByRole("button", { name: tab }).click();
    await expect(page.locator("#" + pageId)).toHaveClass(/active/);
  }

  await page.getByRole("button", { name: "Add airplane" }).click();
  await expect(page.locator("#profile-editor")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("#profile-editor")).toBeHidden();

  await page.getByRole("button", { name: "INPUTS" }).click();
  await page.getByRole("button", { name: "More options" }).click();
  await expect(page.locator("#main-menu")).toBeVisible();
  await page.locator(".brand").click();
  await expect(page.locator("#main-menu")).toBeHidden();

  await fill(page, "alt-value", "1234");
  await page.getByRole("button", { name: "More options" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear Inputs" }).click();
  for (const id of ["alt","temp","spd","weight","sref","cref","clmax","nz","angle1","angle2","headWind","crossWind","windRef"]) {
    await expect(page.locator("#" + id + "-value")).toHaveValue("");
  }
  await expect(page.locator("#spdDelta-value")).toHaveValue("");

  await page.getByRole("button", { name: "More options" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Airplanes" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("airplanes.txt");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath!, "utf8")).toContain("N=0");

  await page.getByRole("button", { name: "More options" }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import Airplanes" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "airplanes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("N=1\n1_Name=Menu Import\n1_S=20\n1_c=2\n1_Sunit=0\n1_cunit=0\n1_Wunit=0\n"),
  });
  await expect(page.locator(".airplane-name-button strong")).toHaveText("Menu Import");

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("#settings-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "More options" }).click();
  const feedback = page.getByRole("link", { name: "Send Feedback" });
  await expect(feedback).toHaveAttribute("href", "mailto:flightdyn@gmail.com?subject=AeroCalculator%20Feedback");
  await page.getByRole("button", { name: "More options" }).click();

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "About" }).click();
  await expect(page.locator("#about-dialog")).toBeVisible();
  const aboutIcon = page.locator("#about-dialog img");
  const aboutVisual = await aboutIcon.evaluate((img) => ({
    width: img.getBoundingClientRect().width,
    height: img.getBoundingClientRect().height,
    background: getComputedStyle(img).backgroundColor,
  }));
  expect(aboutVisual.width).toBeGreaterThanOrEqual(58);
  expect(aboutVisual.height).toBeGreaterThanOrEqual(58);
  expect(aboutVisual.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(aboutVisual.background).not.toBe("rgb(255, 255, 255)");
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator("#about-dialog")).toBeHidden();
});

test("every calculator type and unit option can be selected and calculated", async ({ page }) => {
  await validBaseline(page);

  for (const type of ["Hp", "Hg"]) {
    await select(page, "alt-type", type);
    await fill(page, "alt-value", "10000");
    await cycle(page.locator("#alt-unit"), lengthUnits);
    await expect(page.locator("#calc-status")).toBeHidden();
  }
  await select(page, "alt-type", "P");
  await fill(page, "alt-value", "1013.25");
  await cycle(page.locator("#alt-unit"), pressureUnits);
  await expect(page.locator("#calc-status")).toBeHidden();
  await select(page, "alt-type", "Hp");
  await select(page, "alt-unit", "ft");
  await fill(page, "alt-value", "10000");

  for (const type of ["Δ ISA", "OAT"]) {
    await select(page, "temp-type", type);
    await fill(page, "temp-value", type === "OAT" ? "15" : "0");
    await cycle(page.locator("#temp-unit"), temperatureUnits);
    await expect(page.locator("#calc-status")).toBeHidden();
  }
  await select(page, "temp-type", "Δ ISA");
  await select(page, "temp-unit", "°C");
  await fill(page, "temp-value", "0");

  const speedCases = [
    ["TAS", "180"], ["CAS", "180"], ["EAS", "170"], ["Mach", "0.4"], ["CL", "0.5"],
    ["Vs Factor", "1.3"], ["Ground Speed", "180"], ["Qdyn", "10"], ["Qc", "10"],
  ] as const;
  for (const [type, value] of speedCases) {
    await select(page, "spd-type", type);
    await fill(page, "spd-value", value);
    if (type === "Vs Factor") {
      await expect(page.locator("#spdDelta-label")).toBeVisible();
      await fill(page, "spdDelta-value", "10");
    } else if (["TAS", "CAS", "EAS", "Ground Speed"].includes(type)) {
      await cycle(page.locator("#spd-unit"), speedUnits);
    } else if (["Qdyn", "Qc"].includes(type)) {
      await cycle(page.locator("#spd-unit"), pressureUnits);
    } else {
      await expect(page.locator("#spd-unit")).toHaveValue("—");
    }
    await expect(page.locator("#calc-status")).toBeHidden();
  }
  await select(page, "spd-type", "TAS");
  await select(page, "spd-unit", "kt");
  await fill(page, "spd-value", "180");

  await fill(page, "weight-value", "10000");
  await cycle(page.locator("#weight-unit"), massUnits);
  await fill(page, "sref-value", "30");
  await cycle(page.locator("#sref-unit"), areaUnits);
  await fill(page, "cref-value", "2");
  await cycle(page.locator("#cref-unit"), chordUnits);

  for (const [type, value, unit] of [["NzPullup", "1.2", "g"], ["NzTurn", "2", "g"], ["BankTurn", "30", "deg"]] as const) {
    await select(page, "nz-type", type);
    await fill(page, "nz-value", value);
    await expect(page.locator("#nz-unit")).toHaveValue(unit);
    await expect(page.locator("#calc-status")).toBeHidden();
  }

  for (const type of ["Track", "Heading"]) {
    await select(page, "angle1-type", type);
    await fill(page, "angle1-value", "10");
    await cycle(page.locator("#angle1-unit"), angleUnits);
    await expect(page.locator("#calc-status")).toBeHidden();
  }
  for (const type of ["Sideslip", "Drift"]) {
    await select(page, "angle2-type", type);
    await fill(page, "angle2-value", "2");
    await cycle(page.locator("#angle2-unit"), angleUnits);
    await expect(page.locator("#calc-status")).toBeHidden();
  }

  await select(page, "headWind-type", "HeadWind");
  await fill(page, "headWind-value", "10");
  await fill(page, "crossWind-value", "5");
  await cycle(page.locator("#headWind-unit"), speedUnits);
  await cycle(page.locator("#crossWind-unit"), speedUnits);
  await cycle(page.locator("#windRef-unit"), angleUnits);
  await expect(page.locator('[data-field="crossWind"]')).toBeVisible();

  await select(page, "headWind-type", "Wind Speed");
  await fill(page, "headWind-value", "20");
  await fill(page, "windRef-value", "270");
  await cycle(page.locator("#headWind-unit"), speedUnits);
  await cycle(page.locator("#windRef-unit"), angleUnits);
  await expect(page.locator('[data-field="crossWind"]')).toBeHidden();
  await expect(page.locator("#windRef-type")).toHaveValue("Wind Direction");
  await expect(page.locator("#calc-status")).toBeHidden();
});

test("every settings option saves and reformats the corresponding output", async ({ page }) => {
  await validBaseline(page);
  await select(page, "nz-type", "NzTurn");
  await fill(page, "nz-value", "2");

  const cases = [
    ["setting-altitude", lengthUnits, "Pressure Altitude"],
    ["setting-pressure", pressureUnits, "Pressure"],
    ["setting-temperature", temperatureUnits, "Temperature"],
    ["setting-speed", speedUnits, "True Airspeed"],
    ["setting-angle", angleUnits, "Bank Angle φ"],
  ] as const;

  for (const [id, values, output] of cases) {
    for (const value of values) {
      await openSettings(page);
      await select(page, id, value);
      await saveSettings(page);
      await page.getByRole("button", { name: "CALCULATE" }).click();
      await expect(page.locator(`[data-result="${output}"]`)).toContainText(value);
      await page.getByRole("button", { name: "INPUTS" }).click();
    }
  }

  for (const interval of ["0/360", "-180/180"]) {
    await openSettings(page);
    await select(page, "setting-angle-format", interval);
    await saveSettings(page);
  }

  for (const theme of themes) {
    await openSettings(page);
    await select(page, "setting-theme", theme);
    await saveSettings(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  }

  await openSettings(page);
  await page.locator("#setting-extra-decimal").check();
  await saveSettings(page);
  await openSettings(page);
  await expect(page.locator("#setting-extra-decimal")).toBeChecked();
  await page.locator("#setting-extra-decimal").uncheck();
  await saveSettings(page);
});

test("aircraft editor exercises every unit, weight, flap, save, edit and delete control", async ({ page }) => {
  await fresh(page);
  await page.getByRole("button", { name: "Add airplane" }).click();

  await cycle(page.locator("#profile-sref-unit"), areaUnits);
  await cycle(page.locator("#profile-cref-unit"), chordUnits);
  await cycle(page.locator("#profile-weight-unit"), massUnits);
  await select(page, "profile-sref-unit", "m²");
  await select(page, "profile-cref-unit", "m");
  await select(page, "profile-weight-unit", "kg");

  await fill(page, "profile-name", "Full Audit Jet");
  await fill(page, "profile-sref", "42");
  await fill(page, "profile-cref", "3");

  const weights = ["MTOW", "MLW", "MZFW", "BOW", "Heavy", "Light"] as const;
  for (let i = 0; i < weights.length; i += 1) {
    await fill(page, "profile-weight-" + weights[i], String(12000 - i * 500));
  }

  for (let i = 0; i < 14; i += 1) {
    await page.getByRole("button", { name: "Add flap CLmax" }).click();
    await fill(page, "profile-flap-" + i, (1.4 + i * 0.05).toFixed(2));
  }
  await expect(page.locator("[data-flap-row]:visible")).toHaveCount(14);
  await expect(page.getByRole("button", { name: "Add flap CLmax" })).toBeDisabled();

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".airplane-name-button strong")).toHaveText("Full Audit Jet");
  await page.locator(".airplane-name-button").click();

  await expect(page.locator("#weight-type option")).toHaveCount(7);
  for (let i = 0; i < weights.length; i += 1) {
    await select(page, "weight-type", weights[i]);
    await expect(page.locator("#weight-value")).toHaveValue(String(12000 - i * 500));
  }

  await expect(page.locator("#clmax-type option")).toHaveCount(15);
  for (let i = 0; i < 14; i += 1) {
    await select(page, "clmax-type", "Flap " + i);
    await expect(page.locator("#clmax-value")).toHaveValue((1.4 + i * 0.05).toFixed(2));
  }

  await page.getByRole("button", { name: "AIRPLANES" }).click();
  await page.locator(".airplane-edit-button").click();
  await expect(page.locator("[data-flap-row]:visible")).toHaveCount(14);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Airplane" }).click();
  await expect(page.locator(".airplane-list-row")).toHaveCount(0);
  await page.getByRole("button", { name: "INPUTS" }).click();
  await expect(page.locator("#airplane-select option")).toHaveCount(1);
  await expect(page.locator("#airplane-select")).toHaveValue("custom");
});

test("invalid edge inputs fail visibly without crashing the web app", async ({ page }) => {
  await validBaseline(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await select(page, "alt-type", "P");
  await fill(page, "alt-value", "-1");
  await expect(page.locator("#calc-status")).toBeVisible();

  await select(page, "alt-type", "Hp");
  await select(page, "alt-unit", "m");
  await fill(page, "alt-value", "90000");
  await expect(page.locator("#calc-status")).toBeVisible();

  await fill(page, "alt-value", "0");
  await select(page, "spd-type", "Mach");
  await fill(page, "spd-value", "1.2");
  await expect(page.locator("#calc-status")).toBeVisible();

  await select(page, "spd-type", "TAS");
  await select(page, "spd-unit", "kt");
  await fill(page, "spd-value", "180");
  await select(page, "nz-type", "BankTurn");
  await fill(page, "nz-value", "90");
  await expect(page.locator("#calc-status")).toBeVisible();

  expect(errors).toEqual([]);
  await expect(page.locator(".app-shell")).toBeVisible();
});
