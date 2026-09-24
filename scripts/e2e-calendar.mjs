// Calendar edge cases on a production build, with a controlled clock:
// midnight while the app is open, waking up the next morning, 31 Dec → 1 Jan,
// 29 Feb, comparisons of incomplete months, repeating operations on the 31st.
//
//   npm run build && npx vite preview --port 4174 &
//   node scripts/e2e-calendar.mjs
//
// Needs Playwright with Chromium (npx playwright install chromium).
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4174/finance-tracker/';
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
const tx = (id, date, amount, type = 'expense', cat = 'exp-food') => ({ id, type, amount, categoryId: type === 'income' ? 'inc-salary' : cat, date, createdAt: date + 'T10:00:00.000Z', updatedAt: '' });

async function open(browser, at, txs, hash = '#/', extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.clock.install({ time: new Date(at) });
  await ctx.addInitScript(([t, ex]) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('pft:schemaVersion', '1');
    localStorage.setItem('pft:settings', JSON.stringify({ theme: 'light', onboarded: true, isDemoData: false }));
    localStorage.setItem('pft:transactions', JSON.stringify(t));
    for (const [k, v] of Object.entries(ex)) localStorage.setItem(k, JSON.stringify(v));
    localStorage.setItem('seeded', '1');
  }, [txs, extra]);
  await page.goto(BASE + hash);
  await page.locator('main').first().waitFor(); await page.waitForTimeout(300);
  return { page, ctx, errs };
}
const text = (p) => p.locator('main').innerText();
const flat = (s) => s.replace(/\s/g, '');

(async () => {
  const browser = await chromium.launch();

  // 1. Open at 23:59 on 30 Sep, keep the app open past midnight
  {
    const { page, ctx, errs } = await open(browser, '2026-09-30T23:59:00', [tx('a', '2026-09-30', 150_000), tx('b', '2026-09-15', 50_000)]);
    let t = await text(page);
    ok('23:59 30.09: «Сегодня потрачено 150 000»', flat(t).includes('Сегодняпотрачено:150000₫'));
    ok('23:59 30.09: сводка за сентябрь 200 000', flat(t).includes('200000₫'));
    await page.clock.runFor(2 * 60 * 1000); // → 00:01 on 1 Oct, app stays open
    await page.waitForTimeout(300);
    t = await text(page);
    ok('после полуночи без перезагрузки: «Сегодня трат пока нет»', t.includes('Сегодня трат пока нет'), t.split('\n').slice(0, 4).join(' / '));
    ok('после полуночи: Обзор переключился на октябрь (сентябрьских сумм нет)', !flat(t).includes('200000₫'));
    await page.getByRole('link', { name: 'Операции' }).click(); await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Прошлый месяц', exact: true }).click(); await page.waitForTimeout(300);
    t = await text(page);
    ok('Операции: 30.09 теперь «Вчера»', t.includes('Вчера'));
    ok('ошибок нет', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // 2. Asleep in the background across midnight → comes back (focus/visibility)
  {
    const { page, ctx } = await open(browser, '2026-09-24T22:00:00', [tx('a', '2026-09-24', 90_000)]);
    await page.clock.pauseAt(new Date('2026-09-24T22:00:05'));
    await page.clock.setSystemTime(new Date('2026-09-25T08:00:00')); // phone slept, timers didn't run
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(50); await page.clock.resume(); await page.waitForTimeout(300);
    ok('возврат в приложение утром: «Сегодня» обновилось', (await text(page)).includes('Сегодня трат пока нет'));
    await ctx.close();
  }

  // 3. 31 Dec → 1 Jan: year presets and comparison
  {
    const { page, ctx, errs } = await open(browser, '2026-12-31T23:59:00', [tx('a', '2026-12-31', 100_000), tx('b', '2026-06-10', 300_000)], '#/analytics?period=thisYear');
    let t = await text(page);
    ok('31.12: «Этот год» = 400 000 за 2026', flat(t).includes('400000₫'));
    await page.clock.runFor(2 * 60 * 1000); await page.waitForTimeout(300);
    t = await text(page);
    ok('1.01 без перезагрузки: «Этот год» = 2027 (пусто)', !flat(t).includes('400000₫') , t.slice(0, 200).replace(/\n/g, ' / '));
    ok('ошибок нет', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // 4. Leap year: 29 Feb 2028
  {
    const { page, ctx, errs } = await open(browser, '2028-02-29T12:00:00', [tx('a', '2028-02-29', 70_000), tx('b', '2028-02-01', 30_000)], '#/analytics');
    const t = await text(page);
    ok('29.02.2028: «Этот месяц» 1–29 февраля, 100 000', flat(t).includes('100000₫'));
    ok('29.02.2028 (месяц закончился): сравнение с целым январём', /1 фев\. — 29 фев\. 2028/.test(t) && /1 янв\. — 31 янв\. 2028/.test(t), (t.match(/По сравнению[\s\S]{0,120}/) || [''])[0].replace(/\n/g, ' / '));
    ok('ошибок нет', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // 5. Incomplete period on 31 March: compared with the whole of February, not "Feb 1–31"
  {
    const { page, ctx } = await open(browser, '2027-03-31T12:00:00', [tx('a', '2027-03-05', 10_000)], '#/analytics');
    const t = await text(page);
    ok('31.03: сравнение с 1–28 февраля', /1 фев\. — 28 фев\. 2027/.test(t), (t.match(/По сравнению[\s\S]{0,120}/) || [''])[0].replace(/\n/g, ' / '));
    await ctx.close();
  }

  // 6. Recurring: rule on 31 Jan, app not opened until 2 March
  {
    const rule = { id: 'r1', type: 'expense', amount: 5_000_000, categoryId: 'exp-housing', dayOfMonth: 31, startDate: '2027-01-31', lastDate: '2027-01-31', createdAt: '' };
    const { page, ctx } = await open(browser, '2027-03-02T09:00:00', [{ ...tx('first', '2027-01-31', 5_000_000, 'expense', 'exp-housing'), recurringId: 'r1' }], '#/', { 'pft:recurring': [rule] });
    await page.waitForTimeout(300);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pft:transactions')).map(t => t.date).sort());
    ok('регулярная на 31-е: догнала 28.02, 31.03 ещё не наступило', JSON.stringify(stored) === JSON.stringify(['2027-01-31', '2027-02-28']), JSON.stringify(stored));
    ok('toast о добавленной регулярной операции', (await page.locator('body').innerText()).includes('Добавлены регулярные операции: 1'));
    await ctx.close();
  }
  {
    const rule = { id: 'r1', type: 'expense', amount: 5_000_000, categoryId: 'exp-housing', dayOfMonth: 31, startDate: '2027-01-31', lastDate: '2027-02-28', createdAt: '' };
    const { page, ctx } = await open(browser, '2027-03-30T23:59:00', [], '#/', { 'pft:recurring': [rule] });
    await page.clock.runFor(2 * 60 * 1000); await page.waitForTimeout(300);
    const stored2 = await page.evaluate(() => JSON.parse(localStorage.getItem('pft:transactions')).map(t => t.date).sort());
    ok('регулярная: приложение открыто через полночь 31.03 — добавилась сама', stored2.includes('2027-03-31'), JSON.stringify(stored2));
    await ctx.close();
  }

  console.log(results.join('\n'));
  await browser.close();
  if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
})().catch(e => { console.log(results.join('\n')); console.log('CRASH', e.message); process.exit(1); });

