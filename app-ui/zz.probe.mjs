import { chromium } from '@playwright/test';
const base = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 1400 }, isMobile: true });
await page.addInitScript(() => localStorage.setItem('darts-score.activeClub', 'c1'));
await page.goto(`${base}/admin/users`);
await page.waitForSelector('.p-datatable', { timeout: 30000 });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const table = document.querySelector('.p-datatable');
  const styles = [...document.querySelectorAll('style')];
  const media = styles.filter(s => s.textContent.includes('640px')).map(s => s.textContent.slice(0, 200));
  const sheets = [...document.styleSheets].map(sh => { try { return [...sh.cssRules].filter(r => r.cssText.includes('640px') && r.cssText.includes('datatable')).map(r => r.cssText.slice(0, 200)); } catch { return []; } }).flat();
  return { attrs: [...table.attributes].map(a => a.name + '=' + a.value).join(' '), media, sheets: sheets.slice(0, 3), styleCount: styles.length, thead: getComputedStyle(document.querySelector('.p-datatable-thead > tr > th')).display };
});
console.log(JSON.stringify(info, null, 1).slice(0, 2500));
await browser.close();
