// 1.6 features on a production build, with a controlled clock (Fri 2 Oct 2026):
// search over all time, the "Итоги сентября" card, and the tab slide (the
// bottom nav stays put, nothing widens the page).
//
//   npm run build && npx vite preview --port 4174 &
//   node scripts/e2e-v16.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4174/finance-tracker/';
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
const b = await chromium.launch();
process.on('exit', () => console.log(results.join('\n')));
const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.clock.install({ time: new Date('2026-10-02T12:00:00') });
await ctx.addInitScript(() => {
  if (localStorage.getItem('s')) return;
  localStorage.setItem('pft:schemaVersion', '1');
  localStorage.setItem('pft:settings', JSON.stringify({ theme: 'light', onboarded: true, isDemoData: false }));
  const tx = []; let n = 0;
  const add = (date, amount, categoryId, type = 'expense', note) => tx.push({ id: 'x' + n++, type, amount, categoryId, date, note, createdAt: '', updatedAt: '' });
  for (let d = 1; d <= 30; d++) add(`2026-09-${String(d).padStart(2, '0')}`, 100000, 'exp-food'); // Sep: 3 000 000
  add('2026-09-10', 1000000, 'exp-transport'); // Sep total 4 000 000
  for (let d = 1; d <= 20; d++) add(`2026-08-${String(d).padStart(2, '0')}`, 250000, 'exp-food'); // Aug: 5 000 000
  add('2025-06-10', 2500000, 'exp-food', 'expense', 'подарок маме');
  add('2026-10-01', 80000, 'exp-cafe');
  localStorage.setItem('pft:transactions', JSON.stringify(tx)); localStorage.setItem('s', '1');
});
const flat = async () => (await p.locator('main').innerText()).replace(/\s/g, '');
const review = () => p.locator('[data-testid="monthly-review"]');

// ---- Итоги прошлого месяца --------------------------------------------------
await p.goto(BASE); await p.locator('h1', { hasText: 'Обзор' }).waitFor(); await p.waitForTimeout(600);
const r = (await review().innerText().catch(() => '')).replace(/\s/g, '');
ok('Обзор 2.10: карточка «Итоги сентября»', r.startsWith('Итогисентября'), r.slice(0, 40));
ok('итоги: расходы 4 000 000, среднее 133 333 в день', r.includes('Расходы4000000₫') && r.includes('Всреднемвдень133333₫'), r.slice(0, 120));
ok('итоги: главная категория и сравнение с августом (−20%)', r.includes('Еда:75%расходов') && r.includes('на20%меньше,чемвавгусте'), r.slice(120));
await review().click(); await p.locator('h1', { hasText: 'Аналитика' }).waitFor(); await p.waitForTimeout(400);
ok('нажатие → Аналитика «Прошлый месяц»', p.url().includes('#/analytics?period=lastMonth') && (await flat()).includes('4000000₫'), p.url());
await p.goto(BASE); await p.locator('h1', { hasText: 'Обзор' }).waitFor(); await p.waitForTimeout(400);
await review().getByRole('button', { name: 'Скрыть до следующего месяца' }).click(); await p.waitForTimeout(200);
ok('× скрывает карточку и не открывает Аналитику', !(await review().isVisible().catch(() => false)) && !p.url().includes('analytics'));
await p.reload(); await p.locator('h1', { hasText: 'Обзор' }).waitFor(); await p.waitForTimeout(400);
ok('после перезапуска карточки нет', !(await review().isVisible().catch(() => false)));

// ---- Поиск за всё время ----------------------------------------------------
await p.goto(BASE + '#/transactions'); await p.locator('h1', { hasText: 'Операции' }).waitFor(); await p.waitForTimeout(400);
await p.locator('main input').fill('подарок'); await p.waitForTimeout(600);
let t = await flat();
ok('поиск находит операцию за 2025 год: «Найдено: 1 за всё время»', t.includes('Найдено:1завсёвремя') && t.includes('подарокмаме'));
await p.getByRole('button', { name: 'Только за этот месяц' }).click(); await p.waitForTimeout(400);
t = await flat();
ok('«Только за этот месяц» → 0 за этот месяц', t.includes('Найдено:0заэтотмесяц') && !t.includes('подарокмаме'));
await p.getByRole('button', { name: 'Искать за всё время' }).click(); await p.waitForTimeout(400);
await p.getByRole('radio', { name: 'Этот год' }).or(p.getByRole('button', { name: 'Этот год', exact: true })).first().click(); await p.waitForTimeout(400);
ok('выбор периода во время поиска сужает поиск до него', (await flat()).includes('Найдено:0заэтотгод'));
await p.locator('main input').fill(''); await p.waitForTimeout(400);
t = await flat();
ok('очистка поиска → снова период, строки «Найдено» нет', !t.includes('Найдено') && !t.includes('подарокмаме'));

// ---- Сдвиг между вкладками --------------------------------------------------
await p.clock.resume();
const moves = [];
for (const tab of ['Обзор', 'Аналитика', 'Настройки', 'Операции']) {
  await p.evaluate(() => {
    window.__j = []; const t0 = performance.now();
    const tick = () => {
      const de = document.documentElement; const nav = document.querySelector('nav.app-nav--bottom').getBoundingClientRect();
      window.__j.push([de.scrollWidth > de.clientWidth, Math.round(nav.top), Math.round(scrollX)]);
      if (performance.now() - t0 < 500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.locator('nav.app-nav--bottom a', { hasText: tab }).tap(); await p.waitForTimeout(700);
  moves.push(await p.evaluate(() => window.__j));
}
const frames = moves.flat();
ok('сдвиг: страница не шире экрана ни в одном кадре', frames.every((f) => !f[0] && f[2] === 0), `${frames.filter((f) => f[0]).length} из ${frames.length}`);
ok('сдвиг: нижнее меню стоит на месте', new Set(frames.map((f) => f[1])).size === 1, [...new Set(frames.map((f) => f[1]))].join(','));
ok('без ошибок', errs.length === 0, errs.join(' | '));
await b.close();
if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
