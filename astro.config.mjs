import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://example.com',
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  },
  integrations: [
    mdx(),
    tailwind(),
    sitemap()
  ]
});
