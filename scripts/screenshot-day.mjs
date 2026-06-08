import { chromium } from 'playwright';

const browser = await chromium.launch();
const pages = [
  { name: 'home', url: 'http://localhost:4321/' },
  { name: 'notes', url: 'http://localhost:4321/notes' },
  { name: 'tags', url: 'http://localhost:4321/tags' },
  { name: 'detail', url: 'http://localhost:4321/notes/GS-SLAM' },
];

for (const p of pages) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(p.url, { waitUntil: 'networkidle' });
  // Force light mode
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `/tmp/blog-${p.name}.png`, fullPage: false });
  console.log(`Saved: /tmp/blog-${p.name}.png`);
  await page.close();
}

await browser.close();
console.log('All screenshots done');
