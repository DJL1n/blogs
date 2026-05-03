#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const args = process.argv.slice(2);
const parsed = Object.create(null);

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (!arg.startsWith('--')) continue;

  const eqIndex = arg.indexOf('=');
  if (eqIndex !== -1) {
    const key = arg.slice(2, eqIndex);
    const value = arg.slice(eqIndex + 1);
    parsed[key] = value;
    continue;
  }

  const next = args[i + 1];
  if (next && !next.startsWith('--')) {
    parsed[arg.slice(2)] = next;
    i += 1;
    continue;
  }
  parsed[arg.slice(2)] = 'true';
}

if (parsed.help === 'true' || parsed.h === 'true' || parsed['?']) {
  console.log([
    'Usage:',
    '  npm run new:post -- --type note --title "标题" [options]',
    '',
    'Options:',
    '  --type         note | blog | important',
    '  --title        标题',
    '  --slug         文件名 slug',
    '  --summary      摘要',
    '  --category     分类',
    '  --tags         标签（英文逗号分隔）',
    '  --importance   1-5',
    '  --draft        true/false',
    '  --force        覆盖已存在文件'
  ].join('\n'));
  process.exit(0);
}

const COLLECTION_BY_TYPE = {
  note: 'notes',
  notes: 'notes',
  blog: 'blog',
  important: 'important'
};

const rl = readline.createInterface({ input: stdin, output: stdout });

function toDateString(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function normalizeSlug(input) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^\u4e00-\u9fff\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
  return slug || `post-${toDateString()}`;
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

async function ask(question, defaultValue = '') {
  const answer = await rl.question(`${question} `);
  return answer.trim() || defaultValue;
}

async function main() {
  const typeInput =
    (parsed.type ? parsed.type : await ask('内容类型 [note/blog/important] (note):', 'note')).toLowerCase();

  if (!COLLECTION_BY_TYPE[typeInput]) {
    throw new Error(`不支持的类型：${typeInput}`);
  }

  const title = await ask('标题:', parsed.title || '');
  if (!title) throw new Error('标题不能为空');

  const slug = normalizeSlug(parsed.slug || `${title}`);
  const summary = await ask('摘要:', parsed.summary || '一句话说明该篇文章写了什么');
  const category = await ask('分类:', parsed.category || '技巧');
  const tagsInput = await ask('标签（逗号分隔）:', parsed.tags || '');
  const importanceInput = Number(await ask('重要性 1-5:', String(parsed.importance || '2')));
  const draftInput =
    (parsed.draft || (await ask('是否草稿 true/false:', 'false'))).toLowerCase() === 'true';

  const now = toDateString();
  const tags = tagsInput
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const frontmatterType = typeInput === 'notes' ? 'note' : typeInput;
  const folder = COLLECTION_BY_TYPE[typeInput];
  const filePath = path.resolve(process.cwd(), 'src', 'content', folder, `${slug}.md`);

  const content = `---\n` +
    `title: ${yamlString(title)}\n` +
    `date: ${now}\n` +
    `updated: ${now}\n` +
    `summary: ${yamlString(summary)}\n` +
    `tags: [${tags.map((tag) => yamlString(tag)).join(', ')}]\n` +
    `category: ${yamlString(category)}\n` +
    `type: ${yamlString(frontmatterType)}\n` +
    `importance: ${Math.min(Math.max(Number.isNaN(importanceInput) ? 2 : importanceInput, 1), 5)}\n` +
    `draft: ${draftInput}\n` +
    `---\n\n` +
    `## 问题\n\n` +
    `在这里说明你为什么要写这篇内容。\n\n` +
    `## 方案\n\n` +
    `- 方案要点 1\n` +
    `- 方案要点 2\n\n` +
    `## 结果\n\n` +
    `把结论写清楚。\n`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (parsed.force !== 'true') {
    try {
      await fs.access(filePath);
      const cover = (await ask(`文件已存在：${slug}.md，是否覆盖？(y/N):`, 'n')).trim().toLowerCase();
      if (cover !== 'y' && cover !== 'yes') {
        console.log('已取消。');
        return;
      }
    } catch (_) {
      // 文件不存在可以直接写入
    }
  }

  await fs.writeFile(filePath, content, 'utf8');
  console.log(`已创建：${filePath}`);
  console.log('下一步：编辑内容 -> git add -> git commit -> push。');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => {
    rl.close();
  });
