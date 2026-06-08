import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://blogs.djl1n.me',
  server: {
    fs: {
      strict: false,
    },
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  },
  integrations: [
    mdx(),
    react(),
    tailwind(),
    sitemap({
      filter: (page) => !page.includes('/diary/')
    })
  ]
});
