import { getCollection } from 'astro:content';

const REL_COLLECTIONS = ['notes', 'blog', 'important'] as const;
type RelCollection = (typeof REL_COLLECTIONS)[number];
type PostEntry = { data: { title: string; summary: string; draft?: boolean }; slug: string };

export type RelatedPost = {
  title: string;
  summary: string;
  collection: RelCollection;
  slug: string;
  href: string;
};

function parseRelatedReference(raw: string) {
  const trimmed = String(raw || '').trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return null;

  const normalized = trimmed.replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const first = parts[0] as RelCollection;
  if (REL_COLLECTIONS.includes(first) && parts.length >= 2) {
    return { collection: first, slug: parts.slice(1).join('/') };
  }

  return { collection: null, slug: normalized };
}

export async function resolveRelatedPosts(values: string[]): Promise<RelatedPost[]> {
  const allCollections = await Promise.all(
    REL_COLLECTIONS.map(async (collection) => {
      const entries = (await getCollection(collection)).filter(
        (entry: PostEntry) => !entry.data.draft,
      );
      const map = new Map<string, PostEntry>();
      entries.forEach((entry: PostEntry) => map.set(entry.slug, entry));
      return { collection, map };
    }),
  );

  const collectionMaps = allCollections.reduce(
    (acc, item) => {
      acc[item.collection] = item.map;
      return acc;
    },
    {} as Record<RelCollection, Map<string, PostEntry>>,
  );

  const related: RelatedPost[] = [];
  const seen = new Set<string>();

  for (const value of values || []) {
    const parsed = parseRelatedReference(value);
    if (!parsed) continue;

    const candidates = parsed.collection ? [parsed.collection] : REL_COLLECTIONS;
    for (const collection of candidates) {
      const map = collectionMaps[collection];
      const hit = map?.get(parsed.slug);
      if (!hit) continue;

      const href = `/${collection}/${hit.slug}`;
      if (seen.has(href)) continue;
      seen.add(href);
      related.push({
        title: hit.data.title,
        summary: hit.data.summary,
        collection,
        slug: hit.slug,
        href,
      });
      break;
    }
  }

  return related;
}
