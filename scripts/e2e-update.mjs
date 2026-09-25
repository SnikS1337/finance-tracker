// PWA update lifecycle on a production build: publishes a "new version" by
// editing the built files (like a deploy would), then checks the update banner,
// that the old version keeps working until "Обновить", and that data survives.
//
// It MODIFIES dist/ — rebuild afterwards (npm run build).
//
//   npm run build && npx vite preview --port 4174 &
//   node scripts/e2e-update.mjs
//
// Needs Playwright with Chromium (npx playwright install chromium).
import { chromium } from 'playwright';
import fs from 'node:fs';
const DIR = process.env.DIR || 'dist';
const BASE = process.env.BASE || 'http://127.0.0.1:4174/finance-tracker/';
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
function publishNewVersion() {
  // what a deploy does: new index.html → new precache revision in sw.js
  const idx = DIR + '/index.html'; fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace('<head>', '<head><meta name="build" content="v2">'));
  const sw = DIR + '/sw.js'; fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/(\{url:"index\.html",revision:")[^"]*"/, '$1v2-' + Date.now() + '"'));
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { if (!localStorage.getItem('s')) { localStorage.setItem('pft:schemaVersion','1'); localStorage.setItem('pft:settings', JSON.stringify({theme:'light',onboarded:true,isDemoData:false})); localStorage.setItem('pft:transactions','[]'); localStorage.setItem('s','1'); } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.locator('main').waitFor();
  await p.waitForFunction(() => navigator.serviceWorker.ready.then(r => !!r.active));
  await p.reload(); await p.locator('main').waitFor();
  ok('SW управляет страницей', await p.evaluate(() => !!navigator.serviceWorker.controller));
  // data in the old version
  await p.getByLabel('Добавить операцию').first().click(); await p.locator('#amount').fill('4500'); await p.locator('[role="radio"]').first().click();
  await p.getByRole('button', { name: 'Добавить расход' }).click(); await p.waitForTimeout(300);

  publishNewVersion();
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  const banner = await p.getByText('Доступна новая версия').waitFor({ timeout: 15000 }).then(() => true, () => false);
  ok('новая версия → плашка «Доступна новая версия»', banner);
  ok('до нажатия работает старая версия (без перезагрузки)', await p.evaluate(() => !document.querySelector('meta[name="build"]')));
  await p.getByRole('link', { name: 'Операции' }).click(); await p.waitForTimeout(400);
  ok('старая версия продолжает работать: вкладки и данные', (await p.locator('body').innerText()).replace(/\s/g, '').includes('4500₫'));
  // offline → online: banner still there, nothing breaks
  await ctx.setOffline(true); await p.waitForTimeout(300); await ctx.setOffline(false);
  ok('офлайн → онлайн: плашка на месте', await p.getByText('Доступна новая версия').isVisible());
  await Promise.all([p.waitForEvent('load', { timeout: 15000 }).catch(() => null), p.getByRole('button', { name: 'Обновить' }).click()]);
  await p.locator('main').waitFor(); await p.waitForTimeout(500);
  ok('после «Обновить» — новая версия', await p.evaluate(() => !!document.querySelector('meta[name="build"]')));
  ok('данные сохранились после обновления', await p.evaluate(() => JSON.parse(localStorage.getItem('pft:transactions')).some(t => t.amount === 4500)));
  ok('плашка исчезла', !(await p.getByText('Доступна новая версия').isVisible().catch(() => false)));
  // close / reopen the app
  const p2 = await ctx.newPage(); await p.close(); await p2.goto(BASE); await p2.locator('main').waitFor();
  ok('закрыть и открыть заново: новая версия, без плашки', await p2.evaluate(() => !!document.querySelector('meta[name="build"]')) && !(await p2.getByText('Доступна новая версия').isVisible().catch(() => false)));
  ok('без ошибок', errs.length === 0, errs.join(' | '));
  console.log(results.join('\n'));
  await browser.close();
  if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
})().catch(e => { console.log(results.join('\n')); console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
