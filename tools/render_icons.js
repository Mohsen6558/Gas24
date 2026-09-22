// Renders src/pwa-icon.svg into the PNG icons used by the PWA manifest and the Android app.
// Usage: node tools/render_icons.js   (needs Playwright + Chromium)
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'src/pwa-icon.svg'), 'utf8');
// Full-bleed variant (no rounded corners) for maskable / launcher icons.
const fullBleed = svg.replace('rx="112"', 'rx="0"');

const web = ['src/icons', 'src/my/icons'];
const res = 'android/app/src/main/res';
const targets = [
  ...web.flatMap(dir => [
    [svg, 192, `${dir}/icon-192.png`],
    [svg, 512, `${dir}/icon-512.png`],
    [fullBleed, 512, `${dir}/icon-maskable-512.png`],
    [fullBleed, 180, `${dir}/apple-touch-icon.png`],
  ]),
  // Legacy launcher icons for Android < 8 (adaptive icon is a vector for 8+).
  ...[['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]].map(
    ([density, size]) => [svg, size, `${res}/mipmap-${density}/ic_launcher.png`]
  ),
];

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  for (const [markup, size, out] of targets) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`
    );
    fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
    await page.screenshot({ path: path.join(root, out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('wrote', out);
  }
  await browser.close();
})();
