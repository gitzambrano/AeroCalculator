import { expect, test, type Page } from "@playwright/test";

async function swipe(page: Page, startX: number, endX: number, startY = 420, endY = 420): Promise<void> {
  const target = page.locator(".page.active");
  await target.dispatchEvent("pointerdown", {
    pointerId: 21,
    pointerType: "touch",
    isPrimary: true,
    clientX: startX,
    clientY: startY,
    bubbles: true,
  });
  await target.dispatchEvent("pointermove", {
    pointerId: 21,
    pointerType: "touch",
    isPrimary: true,
    clientX: (startX + endX) / 2,
    clientY: (startY + endY) / 2,
    bubbles: true,
  });
  await target.dispatchEvent("pointerup", {
    pointerId: 21,
    pointerType: "touch",
    isPrimary: true,
    clientX: endX,
    clientY: endY,
    bubbles: true,
  });
}

test.describe("helpers and swipe navigation", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("quantity selector and numeric value expose contextual helpers", async ({ page }) => {
    await page.goto("/");

    await page.locator("#spd-type").hover();
    await expect(page.locator("#field-tooltip")).toBeVisible();
    await expect(page.locator("#field-tooltip")).toContainText("Calibrated Airspeed");

    await page.locator("#spd-value").hover();
    await expect(page.locator("#field-tooltip")).toBeVisible();
    await expect(page.locator("#field-tooltip")).toContainText("Calibrated Airspeed");

    await page.locator("#spd-type").selectOption("Mach");
    await page.locator("#spd-value").focus();
    await expect(page.locator("#field-tooltip")).toBeVisible();
    await expect(page.locator("#field-tooltip")).toContainText("Mach number");

    const rect = await page.locator("#field-tooltip").boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(390);

    await page.locator("#windRef-type").focus();
    await expect(page.locator("#field-tooltip")).toContainText("Reference direction");
  });

  test("horizontal finger swipe changes tabs like the Android ViewPager", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "INPUTS" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 330, 70);
    await expect(page.getByRole("button", { name: "CALCULATE" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 70, 330);
    await expect(page.getByRole("button", { name: "INPUTS" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 70, 330);
    await expect(page.getByRole("button", { name: "AIRPLANES" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 70, 330);
    await expect(page.getByRole("button", { name: "AIRPLANES" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 330, 70, 300, 560);
    await expect(page.getByRole("button", { name: "AIRPLANES" })).toHaveAttribute("aria-selected", "true");
  });

  test("swipe is ignored while a dialog is open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.locator("#settings-dialog")).toBeVisible();

    await swipe(page, 330, 70);
    await expect(page.getByRole("button", { name: "INPUTS" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#settings-dialog")).toBeVisible();
  });
});
