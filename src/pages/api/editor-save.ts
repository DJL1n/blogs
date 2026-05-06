import type { APIContext } from 'astro';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TYPE_DIR_MAP = {
  note: 'notes',
  blog: 'blog',
  important: 'important',
};

function sanitizeFileName(value: string) {
  const clean = String(value || '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
  return clean || `note-${Date.now()}`;
}

export async function POST({ request }: APIContext) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.markdown !== 'string') {
      return new Response(JSON.stringify({ ok: false, reason: 'invalid-body' }), {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }

    const type = typeof body.type === 'string' ? body.type : 'note';
    const collection = TYPE_DIR_MAP[type] || 'notes';
    const filename = `${sanitizeFileName(typeof body.filename === 'string' ? body.filename : `note-${new Date().toISOString().slice(0, 10)}`)}.md`;

    const repoRoot = process.cwd();
    const targetDir = path.join(repoRoot, 'src', 'content', collection);
    const targetFile = path.join(targetDir, filename);
    await mkdir(targetDir, { recursive: true });
    await writeFile(targetFile, body.markdown, 'utf8');

    return new Response(
      JSON.stringify({
        ok: true,
        path: `src/content/${collection}/${filename}`,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        reason: err && err.name ? String(err.name) : 'write-failed',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }
}
