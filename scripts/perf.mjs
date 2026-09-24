// Performance check on a production build (run before releases).
//
//   npm run build && npx vite preview --port 4174 &
//   node scripts/perf.mjs 5000        # number of generated operations
//
// Needs Playwright with Chromium (npx playwright install chromium). Emulates a
// phone (375x667, touch) with the CPU slowed down 4x (about a mid-range Android)
// and prints the time from the action to the painted result.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4174/finance-tracker/';
const N = Number(process.argv[2] || 5000);
const NOVT = process.argv[3] === 'novt'; // compare without tab-switch view transitions
function seed(n) {
  const cats = ["exp-food", "exp-groceries", "exp-housing", "exp-transport", "exp-cafe", "exp-entertainment", "exp-shopping", "exp-health"];
  const txs = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor((i / n) * 365));
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const income = i % 25 === 0;
    txs.push({
      id: "p" + i,
      type: income ? "income" : "expense",
      amount: income ? 30_000_000 : 20_000 + ((i * 7919) % 900_000),
      categoryId: income ? "inc-salary" : cats[i % cats.length],
      date: key,
      note: i % 3 === 0 ? "заметка " + i : undefined,
      createdAt: d.toISOString(),
      updatedAt: d.toISOString(),
    });
  }
  return txs;
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(([t, novt]) => { if (novt) delete Document.prototype.startViewTransition; if (!localStorage.getItem('pft:seeded')) { localStorage.setItem('pft:schemaVersion','1'); localStorage.setItem('pft:settings', JSON.stringify({ theme:'light', onboarded:true, isDemoData:false })); localStorage.setItem('pft:transactions', t); localStorage.setItem('pft:seeded','1'); } }, [JSON.stringify(seed(N)), NOVT]);
  const page = await ctx.newPage();
  await page.goto(BASE); await page.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const measure = async (name, act, cond) => {
    await page.evaluate(() => { window.__t0 = performance.now(); });
    await act(); await cond();
    const ms = await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(Math.round(performance.now() - window.__t0))))));
    console.log(name.padEnd(30), ms, 'ms');
  };
  const nav = (n, h) => measure('→ ' + n, () => page.getByRole('link', { name: n }).click(), () => page.locator(h).first().waitFor());
  console.log(`N=${N} VT=${!NOVT}`);
  for (let i = 0; i < 2; i++) {
    await nav('Операции', 'button[data-swiping]'); await page.waitForTimeout(500);
    await nav('Аналитика', 'h1:has-text("Аналитика")'); await page.waitForTimeout(500);
    await nav('Обзор', 'h1:has-text("Обзор")'); await page.waitForTimeout(500);
  }
  await nav('Операции', 'button[data-swiping]'); await page.waitForTimeout(500);
  const sig = () => page.evaluate(() => [...document.querySelectorAll('[data-day-group] h3')].map(h => h.textContent).slice(-1)[0] + '|' + document.querySelectorAll('button[data-swiping]').length + ([...document.querySelectorAll('button')].find(b => b.textContent.startsWith('Показать'))?.textContent || ''));
  const before = await sig();
  await measure('Операции «Этот год»', () => page.getByRole('button', { name: 'Этот год', exact: true }).click(), () => page.waitForFunction(b => ([...document.querySelectorAll('[data-day-group] h3')].map(h => h.textContent).slice(-1)[0] + '|' + document.querySelectorAll('button[data-swiping]').length + ([...document.querySelectorAll('button')].find(b => b.textContent.startsWith('Показать'))?.textContent || '')) !== b, before, { timeout: 60000 }));
  console.log('  строк:', await page.locator('button[data-swiping]').count());
  await page.waitForTimeout(500);
  await measure('поиск: буква в поле', () => page.locator('input[placeholder*="Поиск"]').fill('з'), () => page.waitForTimeout(0));
  await page.waitForTimeout(1500);
  const s2 = await sig();
  await measure('поиск: список обновлён', () => page.locator('input[placeholder*="Поиск"]').fill('заметка 1'), () => page.waitForFunction(b => ([...document.querySelectorAll('[data-day-group] h3')].map(h => h.textContent).slice(-1)[0] + '|' + document.querySelectorAll('button[data-swiping]').length + ([...document.querySelectorAll('button')].find(b => b.textContent.startsWith('Показать'))?.textContent || '')) !== b, s2, { timeout: 60000 }));
  await page.waitForTimeout(800);
  await measure('→ Обзор (с длинным списком)', () => page.getByRole('link', { name: 'Обзор' }).click(), () => page.locator('h1:has-text("Обзор")').waitFor());
  await browser.close();
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
