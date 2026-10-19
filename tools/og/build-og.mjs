/*
 * מייצר את assets/img/og-image.png מתוך tools/og/og.html.
 *
 * הנכס אינו קובץ ידני: הוא נגזר מאותם טוקנים וגופנים של האתר, כך ששינוי
 * בשפה החזותית מתגלגל גם לתצוגה המקדימה בוואטסאפ ובפייסבוק — המסך הראשון
 * שהקהל המופנה רואה.
 *
 *   node tools/og/build-og.mjs
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const out = resolve(root, 'assets/img/og-image.png');

// Chromium המותקן בסביבה; אפשר לעקוף עם CHROMIUM_PATH
const candidates = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);

const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error('לא נמצא Chromium. יש להגדיר CHROMIUM_PATH.');
  process.exit(1);
}

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.goto('file://' + resolve(here, 'og.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();

console.log('נוצר: ' + out);
