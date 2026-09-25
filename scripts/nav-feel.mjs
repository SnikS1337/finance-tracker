// How the bottom navigation feels on a phone (production build, CPU slowed 4x
// ≈ a mid-range Android): time from touch to the tab lighting up, to the new
// page being visible, and until everything has settled. Then checks that a
// second tap right after the first one is not lost.
//
//   npm run build && npx vite preview --port 4174 &
//   node scripts/nav-feel.mjs [cpuSlowdown=4]
//
// 1.6 targets: tab lit ≤ 20 ms, page visible ≈ 20–200 ms, settled ≤ 450 ms (the
// slide-in is 240 ms and never blocks input), 0 lost taps.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4174/finance-tracker/';
const CPU = Number(process.argv[2] || 4);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  if (!localStorage.getItem('s')) {
    localStorage.setItem('pft:schemaVersion','1'); localStorage.setItem('pft:settings', JSON.stringify({theme:'light',onboarded:true,isDemoData:false}));
    const tx = []; const d = new Date();
    for (let i = 0; i < 300; i++) { const x = new Date(d); x.setDate(x.getDate() - (i % 60)); tx.push({ id: 'p' + i, type: 'expense', amount: 10000 + i * 137, categoryId: ['exp-food','exp-cafe','exp-transport'][i % 3], date: x.toISOString().slice(0, 10), createdAt: '', updatedAt: '' }); }
    localStorage.setItem('pft:transactions', JSON.stringify(tx)); localStorage.setItem('s','1');
  }
  // instrumentation
  window.__m = {};
  addEventListener('pointerdown', () => { window.__m.t0 = performance.now(); }, true);
  const orig = Document.prototype.startViewTransition;
  if (orig) Document.prototype.startViewTransition = function (...a) { const vt = orig.apply(this, a); window.__m.vtStart = performance.now(); vt.updateCallbackDone.then(() => { window.__m.vtSwap = performance.now(); }, () => {}); vt.finished.then(() => { window.__m.vtEnd = performance.now(); }); return vt; };
  new MutationObserver(() => {
    const ind = document.querySelector('nav.app-nav--bottom .nav-indicator')?.style.transform;
    if (window.__m.t0 && ind && ind !== window.__m.ind0 && !window.__m.active) window.__m.active = performance.now();
    const h = document.querySelector('main h1')?.textContent;
    if (window.__m.t0 && h === window.__target && !window.__m.page) window.__m.page = performance.now();
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['aria-current', 'class'] });
});
const p = await ctx.newPage();
await p.goto(BASE); await p.locator('h1').waitFor(); await p.waitForTimeout(2000); // chunks preloaded
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
const rows = [];
for (const [tab, h] of [['Операции','Операции'],['Аналитика','Аналитика'],['Настройки','Настройки'],['Обзор','Обзор'],['Операции','Операции'],['Обзор','Обзор']]) {
  await p.evaluate((t) => { window.__m = { ind0: document.querySelector('nav.app-nav--bottom .nav-indicator')?.style.transform }; window.__target = t; }, tab);
  const link = p.locator('nav.app-nav--bottom a', { hasText: tab });
  await link.tap();
  await p.locator('h1', { hasText: h }).waitFor();
  await p.waitForTimeout(900);
  const m = await p.evaluate(() => window.__m);
  const r = (x) => (x ? Math.round(x - m.t0) : '—');
  const shown = m.vtSwap ? r(m.vtSwap) : r(m.page);
  const settled = m.vtEnd ? r(m.vtEnd) : Math.max(r(m.page) + 240, (m.active ? r(m.active) : r(m.page)) + 180);
  const lit = m.vtSwap ? shown : r(m.active);
  rows.push(`${('→ ' + tab).padEnd(14)} вкладка подсветилась ${String(lit).padStart(4)} | страница видна ${String(shown).padStart(4)} | всё успокоилось ${String(settled).padStart(4)} мс`);
}
console.log(`CPU×${CPU}`); console.log(rows.join('\n'));
await b.close();

// ---- Second tap right after the first --------------------------------------
{
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { if (!localStorage.getItem('s')) { localStorage.setItem('pft:schemaVersion','1'); localStorage.setItem('pft:settings', JSON.stringify({theme:'light',onboarded:true,isDemoData:false})); localStorage.setItem('pft:transactions','[]'); localStorage.setItem('s','1'); } });
  const p = await ctx.newPage(); await p.goto(BASE); await p.locator('main').waitFor(); await p.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const pos = {};
  for (const t of ['Операции','Аналитика','Настройки','Обзор']) { const bb = await p.locator('nav.app-nav--bottom a', { hasText: t }).boundingBox(); pos[t] = [bb.x + bb.width / 2, bb.y + bb.height / 2]; }
  const tap = async (t) => { const [x, y] = pos[t]; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  let lost = 0; const N = 8; const seq = ['Операции','Аналитика','Настройки','Обзор'];
  for (let i = 0; i < N; i++) {
    const a = seq[i % 4], z = seq[(i + 1) % 4];
    await tap(a);
    await p.waitForTimeout(150);                     // second tap while the first switch is still settling
    await tap(z);
    await p.waitForTimeout(900);
    const h = await p.evaluate(() => document.querySelector('nav.app-nav--bottom a[aria-current="page"]')?.getAttribute('aria-label'));
    if (h !== z) lost++;
  }
  console.log(`быстрые двойные переходы (второе нажатие через 150 мс): потеряно ${lost} из ${N}`);
  await b.close();

}

