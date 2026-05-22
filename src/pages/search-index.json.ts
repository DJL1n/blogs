import { getCollection } from 'astro:content';

export async function GET() {
  const posts = [
    ...(await getCollection('blog')).filter((p) => !p.data.draft),
    ...(await getCollection('notes')).filter((p) => !p.data.draft),
    ...(await getCollection('important')).filter((p) => !p.data.draft),
  ]
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map((post) => ({
      title: post.data.title,
      summary: post.data.summary,
      tags: post.data.tags,
      category: post.data.category,
      collection: post.collection,
      slug: post.slug,
      date: post.data.date.toISOString(),
    }));

  return new Response(JSON.stringify(posts), {
    headers: { 'Content-Type': 'application/json' },
  });
}
