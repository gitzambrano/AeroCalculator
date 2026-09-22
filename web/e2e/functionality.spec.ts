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
  expect(Number.parseFloat(await resultText(page, "Bank Angle φ"))).toBeCloseTo(Math.PI / 3, 2);

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

test("output settings change formatting without changing the calculation", async ({ page }) => {
  await setupBaseline(page);
  await select(page, "spd-type", "TAS");
  await fill(page, "spd-value", "100");
  const machBefore = await resultText(page, "Mach");

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await select(page, "setting-speed", "m/s");
  await select(page, "setting-angle", "deg");
  await page.locator("#settings-form").getByRole("button", { name: "Save" }).click();

  expect(await resultText(page, "True Airspeed")).toContain("m/s");
  expect(await resultText(page, "Bank Angle φ")).toContain("deg");
  expect(await resultText(page, "Mach")).toBe(machBefore);

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("#setting-extra-decimal").check();
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
  await page.locator(".airplane-name-button").click();
  await expect(page.locator("#airplane-select")).toHaveValue(/.+/);
  await expect(page.locator("#sref-value")).toHaveValue("42");
  await select(page, "weight-type", "MTOW");
  await expect(page.locator("#weight-value")).toHaveValue("12000");
  await expect(page.locator("#clmax-type option")).toHaveCount(2);
  await select(page, "clmax-type", "Flap 0");
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

  const bravoRow = page.locator(".airplane-list-row").filter({ hasText: "Bravo" });
  const alphaRow = page.locator(".airplane-list-row").filter({ hasText: /^Alpha10/ });

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
