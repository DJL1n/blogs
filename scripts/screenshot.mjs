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
  await page.waitForTimeout(800);
  const outPath = `/tmp/blog-${p.name}.png`;
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Saved: ${outPath}`);
  await page.close();
}

await browser.close();
console.log('All screenshots done');
