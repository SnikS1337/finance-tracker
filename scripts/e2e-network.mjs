// Offline, flaky and slow network on a production build (Playwright + Chromium, phone-sized).
//
//   npm run build && npx vite preview --port 4174 &
//   node scripts/e2e-network.mjs
//
// Needs Playwright with Chromium (npx playwright install chromium).
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4174/finance-tracker/';
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
const seedInit = () => { if (!localStorage.getItem('seeded')) { localStorage.setItem('pft:schemaVersion','1'); localStorage.setItem('pft:settings', JSON.stringify({theme:'light',onboarded:true,isDemoData:false})); localStorage.setItem('pft:transactions', JSON.stringify([{id:'a',type:'expense',amount:45000,categoryId:'exp-food',date:new Date().toISOString().slice(0,10),createdAt:'',updatedAt:''}])); localStorage.setItem('seeded','1'); } };
(async () => {
  const browser = await chromium.launch();
  const mk = async (opts = {}) => { const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, ...opts }); await ctx.addInitScript(seedInit); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); return { ctx, page, errs }; };
  const body = (p) => p.locator('body').innerText();

  // 1. Online visit → later fully offline: open, reload, every tab, add an operation
  {
    const { ctx, page, errs } = await mk();
    await page.goto(BASE); await page.locator('h1').first().waitFor();
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
    await page.waitForTimeout(1500);
    await ctx.setOffline(true);
    const p2 = await ctx.newPage(); // "opening the app again" with no network
    await p2.goto(BASE).catch(() => {}); 
    const started = await p2.locator('h1', { hasText: 'Обзор' }).waitFor({ timeout: 8000 }).then(() => true, () => false);
    ok('офлайн: повторное открытие показывает Обзор', started);
    let allTabs = true;
    for (const tab of ['Операции', 'Аналитика', 'Настройки', 'Обзор']) {
      await p2.getByRole('link', { name: tab }).click(); await p2.waitForTimeout(600);
      if ((await body(p2)).includes('Не удалось загрузить')) allTabs = false;
    }
    ok('офлайн: все вкладки открываются', allTabs);
    await p2.getByLabel('Добавить операцию').first().click(); await p2.locator('#amount').fill('1000'); await p2.locator('[role="radio"]').first().click();
    await p2.getByRole('button', { name: 'Добавить расход' }).click(); await p2.waitForTimeout(400);
    ok('офлайн: операция добавляется', (await body(p2)).includes('Расход добавлен'));
    await p2.reload().catch(() => {}); await p2.waitForTimeout(1200);
    ok('офлайн: перезагрузка работает', (await body(p2)).includes('Обзор'));
    await ctx.setOffline(false); await p2.waitForTimeout(500);
    ok('сеть вернулась: без ошибок', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // 2. A section that isn't cached yet + no network → clear message + retry, then recovers by itself
  {
    const { ctx, page } = await mk({ serviceWorkers: 'block' });
    await page.route(/Settings-.*\.js$/, (r) => r.abort('internetdisconnected'));
    await page.goto(BASE); await page.locator('h1').first().waitFor();
    await ctx.setOffline(true);
    await page.getByRole('link', { name: 'Настройки' }).click(); await page.waitForTimeout(1500);
    const t = await body(page);
    ok('раздел не в кеше + нет сети: понятное сообщение и «Повторить»', t.includes('Не удалось загрузить раздел') && /Повторить/.test(t), t.slice(0, 160).replace(/\n/g, ' / '));
    ok('навигация остаётся рабочей', await page.getByRole('link', { name: 'Обзор' }).isVisible());
    await page.unroute(/Settings-.*\.js$/);
    await ctx.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    const recovered = await page.locator('h1', { hasText: 'Настройки' }).waitFor({ timeout: 8000 }).then(() => true, () => false);
    ok('сеть вернулась: раздел догружается сам, без бесконечной загрузки', recovered);
    await ctx.close();
  }

  // 3. Slow 3G first launch
  {
    const { ctx, page, errs } = await mk({ serviceWorkers: 'block' });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 });
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: 'commit' });
    await page.locator('#startup').waitFor({ state: 'visible' }); const tStartup = Date.now() - t0;
    await page.locator('h1', { hasText: 'Обзор' }).waitFor({ timeout: 60000 }); const tApp = Date.now() - t0;
    ok('медленный 3G: экран запуска сразу', tStartup < 2500, `${tStartup} мс`);
    ok('медленный 3G: приложение открылось', tApp < 20000, `${tApp} мс`);
    ok('медленный 3G: без ошибок', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // 4. Network drops while the app itself is loading (first visit, nothing cached)
  {
    const { ctx, page } = await mk({ serviceWorkers: 'block' });
    await page.route(/assets\/index-.*\.js$/, (r) => r.abort('internetdisconnected'));
    await page.goto(BASE);
    await page.waitForTimeout(16000);
    const t = await body(page);
    ok('обрыв во время загрузки: не вечная «Загружаем приложение…»', !(/Загружаем приложение/.test(t) && !/Повторить|Не удалось/.test(t)), t.replace(/\n/g, ' / ').slice(0, 160));
    await ctx.close();
  }

  console.log(results.join('\n'));
  await browser.close();
  if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
})().catch(e => { console.log(results.join('\n')); console.log('CRASH', e.message); process.exit(1); });
