// Cross-tab sync, export/import and form edge cases on a production build (Playwright + Chromium, phone-sized).
//
//   npm run build && npx vite preview --port 4174 &
//   node scripts/e2e-data.mjs
//
// Needs Playwright with Chromium (npx playwright install chromium).
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:4174/finance-tracker/';
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
const today = new Date().toISOString().slice(0, 10);
const tx = (id, amount, extra = {}) => ({ id, type: 'expense', amount, categoryId: 'exp-food', date: today, createdAt: new Date().toISOString(), updatedAt: '', ...extra });
function seedScript() {
  return ([d]) => { if (localStorage.getItem('seeded')) return; localStorage.setItem('pft:schemaVersion','1'); localStorage.setItem('pft:settings', JSON.stringify({theme:'light',onboarded:true,isDemoData:false})); for (const [k,v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); localStorage.setItem('seeded','1'); };
}
(async () => {
  const browser = await chromium.launch();
  const mk = async (data = {}, opts = {}) => { const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, acceptDownloads: true, ...opts }); await ctx.addInitScript(seedScript(), [data]); return ctx; };
  const newPage = async (ctx, hash = '#/') => { const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', e => p.__errs.push(e.message)); await p.goto(BASE + hash); await p.locator('main').waitFor(); await p.waitForTimeout(300); return p; };
  const body = (p) => p.locator('body').innerText();
  const flat = (s) => s.replace(/\s/g, '');
  const addExpense = async (p, amount) => { await p.getByLabel('Добавить операцию').first().click(); await p.locator('#amount').fill(String(amount)); await p.locator('[role="radio"]').first().click(); await p.getByRole('button', { name: 'Добавить расход' }).click(); await p.waitForTimeout(250); };

  // ---------- Cross-tab ----------
  {
    const ctx = await mk({ 'pft:transactions': [] });
    const A = await newPage(ctx, '#/transactions'); const B = await newPage(ctx, '#/transactions');
    await addExpense(A, 12345); await B.waitForTimeout(400);
    ok('вкладки: добавление в A видно в B', flat(await body(B)).includes('12345₫'));
    // delete in B
    const row = B.locator('button[data-swiping]').first(); const box = await row.boundingBox();
    const cdp = await ctx.newCDPSession(B);
    const tp = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: box.y + box.height / 2 }] });
    await tp('touchStart', box.x + 300); for (const dx of [30, 80, 130]) { await tp('touchMove', box.x + 300 - dx); await B.waitForTimeout(16); } await tp('touchEnd', 0);
    await B.waitForTimeout(900); await A.waitForTimeout(300);
    ok('вкладки: удаление в B пропало в A', !flat(await body(A)).includes('12345₫'));
    // settings: theme in A → B
    await A.goto(BASE + '#/settings'); await A.locator('main').waitFor(); await A.getByRole('button', { name: 'Тёмная' }).click(); await B.waitForTimeout(400);
    ok('вкладки: тема из A применилась в B', await B.evaluate(() => document.documentElement.classList.contains('dark')));
    // simultaneous: both add
    await A.goto(BASE + '#/'); await A.locator('main').waitFor();
    // One person, two tabs: actions a moment apart. (Truly simultaneous writes
    // from two tabs within a few ms can race — localStorage has no transactions;
    // accepted, a single user can't do that.)
    await addExpense(A, 111); await addExpense(B, 222); await A.waitForTimeout(500);
    const stored = await A.evaluate(() => JSON.parse(localStorage.getItem('pft:transactions')).map(t => t.amount));
    ok('вкладки: добавление почти одновременно в двух вкладках — обе сохранены', stored.includes(111) && stored.includes(222), JSON.stringify(stored));
    // budget in A → B dashboard
    await B.goto(BASE + '#/'); await B.locator('main').waitFor();
    await A.goto(BASE + '#/settings'); await A.locator('main').waitFor(); await A.getByRole('button', { name: '+ Бюджет на месяц' }).first().click(); await A.locator('[role="dialog"] input').first().fill('5000000'); await A.getByRole('button', { name: 'Сохранить бюджет' }).click(); await B.waitForTimeout(400);
    ok('вкладки: бюджет из A виден на Обзоре в B', (await body(B)).includes('Бюджет на месяц'));
    await A.goto(BASE + '#/'); await A.locator('main').waitFor();
    // recurring from A shows in B settings, catch-up not duplicated across tabs
    const past = new Date(); past.setMonth(past.getMonth() - 2); const pastKey = past.toISOString().slice(0, 10);
    await A.getByLabel('Добавить операцию').first().click(); await A.locator('#amount').fill('777000'); await A.locator('[role="radio"]').first().click();
    await A.locator('button[aria-controls="transaction-advanced"]').click(); await A.locator('#date').fill(pastKey); await A.locator('#transaction-advanced input[type="checkbox"]').check();
    await A.getByRole('button', { name: 'Добавить расход' }).click(); await A.waitForTimeout(400);
    await B.reload(); await B.waitForTimeout(600); await A.reload(); await A.waitForTimeout(600);
    const rec = await A.evaluate(() => JSON.parse(localStorage.getItem('pft:transactions')).filter(t => t.amount === 777000).map(t => t.date).sort());
    ok('вкладки: регулярная операция не задублирована двумя вкладками', new Set(rec).size === rec.length && rec.length === 3, JSON.stringify(rec));
    ok('вкладки: без ошибок', A.__errs.length + B.__errs.length === 0, [...A.__errs, ...B.__errs].join(' | '));
    await ctx.close();
  }

  // ---------- Export / import ----------
  {
    const note = 'обед; "бизнес-ланч"\nс коллегами';
    const ctx = await mk({ 'pft:transactions': [tx('a', 999_999_999_999, { note }), tx('b', 1)] });
    const p = await newPage(ctx, '#/settings');
    const [csv] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Экспорт CSV' }).click()]);
    const buf = fs.readFileSync(await csv.path()); const text = buf.toString('utf8');
    ok('CSV: UTF-8 BOM', buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);
    ok('CSV: разделитель ; и CRLF', text.split('\r\n')[0].split(';').length === 5);
    ok('CSV: большая сумма целиком', text.includes(';999999999999;'));
    ok('CSV: заметка с ; кавычками и переносом экранирована', text.includes('"обед; ""бизнес-ланч""\nс коллегами"'));
    const [json] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Экспорт JSON' }).click()]);
    const backup = JSON.parse(fs.readFileSync(await json.path(), 'utf8'));
    const importFile = async (obj, name) => {
      const path = `/tmp/${name}.json`; fs.writeFileSync(path, typeof obj === 'string' ? obj : JSON.stringify(obj));
      await p.locator('input[type="file"]').setInputFiles(path); await p.waitForTimeout(300);
      const c = p.getByRole('button', { name: 'Импортировать и заменить' }); if (await c.count()) await c.click();
      await p.waitForTimeout(500);
    };
    const before = await p.evaluate(() => localStorage.getItem('pft:transactions'));
    await importFile('{ not json', 'broken');
    ok('импорт: не-JSON → сообщение, данные не тронуты', (await p.evaluate(() => localStorage.getItem('pft:transactions'))) === before && (await body(p)).includes('Этот файл не похож на корректную резервную копию.'));
    await importFile({ ...backup, transactions: [{ ...backup.transactions[0], amount: '100' }] }, 'types');
    ok('импорт: неправильные типы → отказ, данные не тронуты', (await p.evaluate(() => localStorage.getItem('pft:transactions'))) === before);
    await importFile({ ...backup, transactions: [...backup.transactions, { id: 'x' }] }, 'partial');
    ok('импорт: частично битый файл → отказ целиком', (await p.evaluate(() => localStorage.getItem('pft:transactions'))) === before);
    await importFile({ ...backup, extra: 1, transactions: backup.transactions.map(t => ({ ...t, foo: 'bar' })) }, 'extra');
    const after = await p.evaluate(() => JSON.parse(localStorage.getItem('pft:transactions')));
    ok('импорт: лишние поля не мешают', after.length === 2 && (await body(p)).includes('импортирована'));
    await importFile(backup, 'again1'); await importFile(backup, 'again2');
    ok('импорт: несколько раз подряд → без дублей', (await p.evaluate(() => JSON.parse(localStorage.getItem('pft:transactions')).length)) === 2);
    ok('экспорт/импорт: без ошибок', p.__errs.length === 0, p.__errs.join(' | '));
    await ctx.close();
  }

  // ---------- UX edge cases ----------
  {
    const ctx = await mk({ 'pft:transactions': [] });
    const p = await newPage(ctx);
    await p.getByLabel('Добавить операцию').first().click(); await p.locator('#amount').fill('5000'); await p.locator('[role="radio"]').first().click();
    await p.getByRole('button', { name: 'Добавить расход' }).dblclick().catch(() => {}); await p.waitForTimeout(500);
    let n = await p.evaluate(() => JSON.parse(localStorage.getItem('pft:transactions')).length);
    ok('двойной тап по «Добавить расход» → одна операция', n === 1, `операций: ${n}`);
    for (let i = 0; i < 5; i++) await addExpense(p, 1000 + i);
    n = await p.evaluate(() => JSON.parse(localStorage.getItem('pft:transactions')).length);
    ok('5 операций подряд → все 5 сохранены', n === 6, `операций: ${n}`);
    // edit right after create
    await p.getByRole('link', { name: 'Операции' }).click(); await p.waitForTimeout(500);
    await p.locator('button[data-swiping]').first().click(); await p.locator('#amount').fill('4242'); await p.getByRole('button', { name: 'Сохранить изменения' }).click(); await p.waitForTimeout(400);
    ok('правка сразу после создания', flat(await body(p)).includes('4242₫'));
    // long category name
    const long = 'Очень длинное название категории для проверки вёрстки на маленьком экране телефона';
    await p.evaluate((name) => { const c = JSON.parse(localStorage.getItem('pft:categories')); c[0].name = name; localStorage.setItem('pft:categories', JSON.stringify(c)); }, long);
    await p.reload(); await p.waitForTimeout(600);
    const overflowAt = async () => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const pages = {};
    for (const [tab, hash] of [['Операции', '#/transactions'], ['Обзор', '#/'], ['Аналитика', '#/analytics'], ['Настройки', '#/settings']]) { await p.goto(BASE + hash); await p.waitForTimeout(700); pages[tab] = await overflowAt(); }
    await p.goto(BASE + '#/'); await p.waitForTimeout(400); await p.getByLabel('Добавить операцию').first().click(); await p.waitForTimeout(400); pages['форма'] = await overflowAt();
    ok('длинное название категории: нет горизонтальной прокрутки', Object.values(pages).every(v => !v), JSON.stringify(pages));
    await p.screenshot({ path: '/tmp/longcat-form.png' });
    ok('UX: без ошибок', p.__errs.length === 0, p.__errs.join(' | '));
    await ctx.close();
  }

  console.log(results.join('\n'));
  await browser.close();
  if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
})().catch(e => { console.log(results.join('\n')); console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
