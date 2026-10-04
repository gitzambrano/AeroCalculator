import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const outDir = resolve(projectRoot, 'artifacts/screenshots/audit_web');
mkdirSync(outDir, { recursive: true });

const themes = [
  'Green Peace',
  'Ancient Brown',
  'Dark Shadows',
  'Blue Sky',
  'Red Alert',
  'Orange Juice'
];

const sampleProfile = [
  {
    id: 'test-b737',
    name: 'Boeing 737-800',
    sref: 124.6,
    srefUnit: 'm²',
    cref: 4.17,
    crefUnit: 'm',
    weightUnit: 'kg',
    weights: {
      MTOW: 79015,
      MLW: 66361,
      MZFW: 62731,
      BOW: 41413
    },
    clmax: [1.8, 1.9, 2.0, 2.2, null, null, null, null, null, null, null, null, null, null]
  }
];

const serverUrl = 'http://localhost:5173';

console.log('Launching browser (viewport: 412x915)...');
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 412, height: 915 }
});

// Inject sample aircraft into localStorage before navigating
await context.addInitScript((profile) => {
  localStorage.setItem('aerocalculator.profiles.v1', JSON.stringify(profile));
  localStorage.setItem('aerocalculator.selectedProfileId.v1', 'test-b737');
  localStorage.setItem('aerocalculator.selected-profile.v1', 'test-b737');
}, sampleProfile);

const page = await context.newPage();

try {
  console.log(`Navigating to ${serverUrl}...`);
  await page.goto(serverUrl);
  await page.waitForLoadState('networkidle');

  // Ensure localStorage is set and reload to load the profile cleanly
  await page.evaluate((profile) => {
    localStorage.setItem('aerocalculator.profiles.v1', JSON.stringify(profile));
    localStorage.setItem('aerocalculator.selectedProfileId.v1', 'test-b737');
    localStorage.setItem('aerocalculator.selected-profile.v1', 'test-b737');
  }, sampleProfile);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);

  const capturedFiles = [];

  for (const theme of themes) {
    const slug = theme.toLowerCase().replace(/ /g, '_');
    console.log(`\n--- Capturing theme: ${theme} (${slug}) ---`);

    // Set theme
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
      try {
        const raw = localStorage.getItem('aerocalculator.settings.v1');
        const parsed = raw ? JSON.parse(raw) : {};
        parsed.theme = t;
        localStorage.setItem('aerocalculator.settings.v1', JSON.stringify(parsed));
      } catch (e) {}
    }, theme);
    await page.waitForTimeout(100);

    // 1. Airplanes tab
    const airplanesTab = page.locator('[data-page="airplanes"]');
    await airplanesTab.click();
    await page.waitForTimeout(200);
    const p1 = `${slug}_01_airplanes.png`;
    await page.screenshot({ path: resolve(outDir, p1), fullPage: false });
    capturedFiles.push(p1);
    console.log(`  [1/5] Saved ${p1}`);

    // 2. Inputs tab
    const inputsTab = page.locator('[data-page="inputs"]');
    await inputsTab.click();
    await page.waitForTimeout(200);
    const p2 = `${slug}_02_inputs.png`;
    await page.screenshot({ path: resolve(outDir, p2), fullPage: false });
    capturedFiles.push(p2);
    console.log(`  [2/5] Saved ${p2}`);

    // 3. Calculate tab
    const calcTab = page.locator('[data-page="calculate"]');
    await calcTab.click();
    await page.waitForTimeout(200);
    const p3 = `${slug}_03_calculate.png`;
    await page.screenshot({ path: resolve(outDir, p3), fullPage: false });
    capturedFiles.push(p3);
    console.log(`  [3/5] Saved ${p3}`);

    // 4. Airplane editor modal
    // Return to Airplanes tab to click edit button on profile, or fallback to #add-profile
    await airplanesTab.click();
    await page.waitForTimeout(200);
    const editBtn = page.locator('.airplane-edit-button').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
    } else {
      await page.locator('#add-profile').click();
    }
    await page.waitForTimeout(300);
    const p4 = `${slug}_04_airplane_editor.png`;
    await page.screenshot({ path: resolve(outDir, p4), fullPage: false });
    capturedFiles.push(p4);
    console.log(`  [4/5] Saved ${p4}`);

    // Close modal (#profile-cancel)
    const profileCancel = page.locator('#profile-cancel');
    await profileCancel.click();
    await page.waitForTimeout(200);

    // 5. Settings dialog
    // Ensure data-action="settings" attribute exists on menu item
    await page.evaluate(() => {
      const btn = document.querySelector('[data-menu="settings"]');
      if (btn && !btn.hasAttribute('data-action')) {
        btn.setAttribute('data-action', 'settings');
      }
    });

    const moreMenu = page.locator('#more-menu');
    await moreMenu.click();
    await page.waitForTimeout(200);

    const settingsBtn = page.locator('[data-action="settings"], [data-menu="settings"]');
    await settingsBtn.click();
    await page.waitForTimeout(300);

    // Ensure the setting-theme select reflects the current theme
    await page.evaluate((t) => {
      const sel = document.getElementById('setting-theme');
      if (sel) sel.value = t;
    }, theme);

    const p5 = `${slug}_05_settings.png`;
    await page.screenshot({ path: resolve(outDir, p5), fullPage: false });
    capturedFiles.push(p5);
    console.log(`  [5/5] Saved ${p5}`);

    // Close settings dialog (#settings-cancel)
    const settingsCancel = page.locator('#settings-cancel');
    await settingsCancel.click();
    await page.waitForTimeout(200);
  }

  console.log(`\nSuccessfully captured all ${capturedFiles.length} screenshots:`);
  for (const file of capturedFiles) {
    console.log(` - ${file}`);
  }
} finally {
  await browser.close();
}
