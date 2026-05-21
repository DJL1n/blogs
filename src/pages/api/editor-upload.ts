import type { APIContext } from 'astro';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function POST({ request }: APIContext) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file || !(file instanceof File) || !file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ ok: false, reason: 'invalid-image' }), {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 6);
    const filename = `${timestamp}-${random}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return new Response(
      JSON.stringify({ ok: true, url: `/uploads/${filename}` }),
      {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, reason: err?.message || 'upload-failed' }),
      {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }
}
