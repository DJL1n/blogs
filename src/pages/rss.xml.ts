import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: string }) {
  const posts = [
    ...(await getCollection('blog')).filter((post) => !post.data.draft),
    ...(await getCollection('notes')).filter((post) => !post.data.draft),
    ...(await getCollection('important')).filter((post) => !post.data.draft)
  ].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: '山不见我',
    description: '技术笔记 · 长期写作 · 个人站点',
    site: context.site || 'https://example.com',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: `/${post.collection === 'blog' ? 'blog' : post.collection === 'notes' ? 'notes' : 'important'}/${post.slug}`
    }))
  });
}
