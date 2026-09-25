// Monthly and weekly budgets on a production build, with a controlled clock
// (Thursday 24 Sep 2026; the week is Mon 21 – Sun 27): Settings, the form,
// the 80% toast with the period, the Overview, and the reset on Monday.
//
//   npm run build && npx vite preview --port 4174 &
//   node scripts/e2e-budgets.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:4174/finance-tracker/';
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
const b = await chromium.launch();
process.on('exit', () => console.log(results.join('\n')));
const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.clock.install({ time: new Date('2026-09-24T12:00:00') }); // Thu; week = Mon 21 – Sun 27
await ctx.addInitScript(() => { if (localStorage.getItem('s')) return; localStorage.setItem('pft:schemaVersion','1'); localStorage.setItem('pft:settings', JSON.stringify({theme:'light',onboarded:true,isDemoData:false}));
  localStorage.setItem('pft:transactions', JSON.stringify([
    {id:'prev',type:'expense',amount:800000,categoryId:'exp-food',date:'2026-09-20',createdAt:'',updatedAt:''},
    {id:'mon',type:'expense',amount:100000,categoryId:'exp-transport',date:'2026-09-21',createdAt:'',updatedAt:''}]));
  localStorage.setItem('s','1'); });
const flat = async () => (await p.locator('main').innerText()).replace(/\s/g, '');
const dialog = () => p.locator('[role="dialog"]');
await p.goto(BASE + '#/settings'); await p.locator('h1', { hasText: 'Настройки' }).waitFor();
ok('Настройки: две кнопки общих бюджетов', await p.getByRole('button', { name: '+ Бюджет на неделю' }).isVisible() && await p.getByRole('button', { name: '+ Бюджет на месяц' }).isVisible());
await p.getByRole('button', { name: '+ Бюджет на неделю' }).click();
ok('форма: заголовок «Бюджет на неделю», подпись про пн–вс', (await dialog().innerText()).includes('Бюджет на неделю') && (await dialog().innerText()).includes('пн–вс'));
await dialog().locator('#budget-amount').fill('1000000'); await p.getByRole('button', { name: 'Сохранить бюджет' }).click(); await p.waitForTimeout(700);
let t = await flat();
ok('недельный бюджет: считается только эта неделя (100 000 из 1 000 000 = 10%)', t.includes('Бюджетнанеделю10%'), t.slice(t.indexOf('Бюджеты'), t.indexOf('Бюджеты') + 80));
ok('кнопка «+ Бюджет на неделю» пропала, «на месяц» осталась', !(await p.getByRole('button', { name: '+ Бюджет на неделю' }).isVisible().catch(() => false)) && await p.getByRole('button', { name: '+ Бюджет на месяц' }).isVisible());
// category weekly budget
await p.getByText('+ Добавить бюджет по категории').click(); await p.getByRole('button', { name: /Еда/ }).first().click();
await dialog().getByRole('radio', { name: 'Неделя' }).click();
await dialog().locator('#budget-amount').fill('500000'); await p.getByRole('button', { name: 'Сохранить бюджет' }).click(); await p.waitForTimeout(700);
t = await flat();
ok('бюджет «Еда» на неделю с пометкой «неделя», 0% (траты прошлой недели не считаются)', /Еданеделя0%/.test(t), t.match(/Еда.{0,30}/)?.[0]);
const det = p.locator('details'); if (!(await det.evaluate(d => d.open))) await p.getByText('+ Добавить бюджет по категории').click();
await det.getByRole('button', { name: /Еда/ }).click(); await dialog().waitFor();
const weekRadio = dialog().getByRole('radio', { name: 'Неделя' });
ok('второй бюджет для «Еды»: предлагается «Месяц», «Неделя» недоступна', (await dialog().getByRole('radio', { name: 'Месяц' }).getAttribute('aria-checked')) === 'true' && await weekRadio.isDisabled());
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// spend → toast with the period
await p.getByLabel('Добавить операцию').first().click(); await p.locator('#amount').fill('450000');
await p.locator('[role="radio"]', { hasText: 'Еда' }).click(); await p.getByRole('button', { name: 'Добавить расход' }).click(); await p.waitForTimeout(500);
const body = await p.locator('body').innerText();
ok('уведомление: «Бюджет «Еда» на неделю: 90%»', body.includes('Бюджет «Еда» на неделю: 90%'), body.match(/Расход добавлен[^\n]*/)?.[0]);
await p.getByRole('link', { name: 'Обзор' }).click(); await p.locator('h1', { hasText: 'Обзор' }).waitFor(); await p.waitForTimeout(1200);
t = await flat();
ok('Обзор: «Бюджет на неделю» 55% и «Еда · неделя» 90%', t.includes('Бюджетнанеделю55%') && /Еданеделя90%/.test(t), t.slice(t.indexOf('Бюджет'), t.indexOf('Бюджет') + 120));
// next Monday: weekly budgets reset, monthly unaffected
await p.clock.runFor(4 * 24 * 3600 * 1000); await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await p.waitForTimeout(500);
t = await flat();
ok('в понедельник (28.09) недельный бюджет обнулился', t.includes('Бюджетнанеделю0%'), t.slice(t.indexOf('Бюджет'), t.indexOf('Бюджет') + 60));
ok('без ошибок', errs.length === 0, errs.join(' | '));
await b.close();
if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
