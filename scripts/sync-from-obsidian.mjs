#!/usr/bin/env node

/**
 * sync-from-obsidian.mjs
 *
 * One-way sync: Obsidian vault → Astro content collections.
 *
 * Source → Target mapping:
 *   40_Knowledge/References/  →  src/content/notes/   (type: "note")
 *   50_Writing/               →  src/content/blog/     (type: "blog")
 *
 * - Skips INDEX.md files.
 * - Generates YAML frontmatter matching the Astro content schema.
 * - Converts [[wikilinks]] to standard Markdown links.
 * - Idempotent: skips destination files whose body matches the source.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ─── Paths ───────────────────────────────────────────────────────────────────

const BLOG_ROOT = path.resolve(import.meta.dirname, '..');

const SOURCE_ROOTS = {
  notes: '/Users/a0000/Documents/Obsidian/HermesBrain/40_Knowledge/References',
  blog:  '/Users/a0000/Documents/Obsidian/HermesBrain/50_Writing',
};

const OUTPUT_DIRS = {
  notes: path.join(BLOG_ROOT, 'src', 'content', 'notes'),
  blog:  path.join(BLOG_ROOT, 'src', 'content', 'blog'),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD. */
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** SHA-256 hex digest of a string. */
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

/** Escape a string value for YAML (double-quote if it contains special chars). */
function yamlStr(s) {
  // YAML-safe plain scalar — double-quote only when necessary
  if (/[\n\r"'#:{}[\],&*?|<>!%@`]/.test(s) || s.trim() !== s) {
    return JSON.stringify(s); // JSON string is valid YAML double-quoted
  }
  return s;
}

// ─── Frontmatter parsing ────────────────────────────────────────────────────

/**
 * Parse YAML frontmatter (--- ... ---) from content.
 * Returns an object of parsed key-value pairs (string values only, no nesting).
 * Returns empty object if no frontmatter found.
 */
function parseFrontmatter(content) {
  const result = {};
  if (!content.startsWith('---')) return result;

  const end = content.indexOf('\n---', 3);
  if (end === -1) return result;

  const fm = content.slice(3, end);
  // Simple YAML key-value parser for flat frontmatter
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      let val = m[2].trim();
      // Strip quotes
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[m[1]] = val;
    }
    // Parse list values: tags:\n  - foo\n  - bar
    const listMatch = line.match(/^(\w+):\s*$/);
    if (listMatch) {
      const key = listMatch[1];
      const items = [];
      const rest = fm.slice(fm.indexOf(line) + line.length).split('\n');
      for (const sub of rest) {
        if (sub.trim() === '') continue; // skip empty lines
        const sm = sub.match(/^\s+-\s+(.+)$/);
        if (sm) items.push(sm[1].trim().replace(/^['"]|['"]$/g, ''));
        else break;
      }
      if (items.length > 0) result[key] = items;
    }
  }
  return result;
}

// ─── Content extraction ─────────────────────────────────────────────────────

/**
 * Extract the first H1 heading (line starting with "# ") as the title.
 * Returns empty string if none found.
 */
function extractTitle(content) {
  const m = content.match(/^# (.+)$/m);
  return m ? m[1].trim() : '';
}

/**
 * Extract summary from a "一句话结论" section.
 * Looks for a heading containing "一句话结论", then takes the first
 * non-empty paragraph after it (up to the next blank line or heading).
 * Falls back to the first ~100 chars of body text if not found.
 */
function extractSummary(content) {
  // Try "一句话结论" section
  const re = /^#+\s+(?:[\d.]+\s*)?一句话结论\s*$/m;
  const match = content.match(re);
  if (match) {
    const afterHeading = content.slice(match.index + match[0].length);
    // Skip blank lines after the heading
    const paraMatch = afterHeading.match(/^\n+(.+?)(?:\n\n|\n#|\n---|$)/s);
    if (paraMatch) {
      const para = paraMatch[1].replace(/\n/g, ' ').trim();
      if (para) return para;
    }
  }

  // Fallback: first ~100 chars of content after the title, stripping markdown
  const bodyStart = content.indexOf('\n\n');
  const body = bodyStart > 0 ? content.slice(bodyStart).trim() : content.trim();
  const clean = body
    .replace(/^#{1,6}\s+.*$/gm, '')  // strip headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip links
    .replace(/[*_~`]/g, '')          // strip formatting
    .replace(/\n+/g, ' ')            // collapse newlines
    .trim();
  return clean.slice(0, 100) + (clean.length > 100 ? '…' : '');
}

/**
 * Extract #tags from inline text (not headings, not code blocks).
 * Matches Obsidian-style tags: #word, #word/sub, #word-word, #CJKchars
 */
function extractTags(content) {
  const tags = new Set();
  // Remove code blocks first
  const noCode = content.replace(/```[\s\S]*?```/g, '');
  // Remove headings (lines starting with #)
  const noHeadings = noCode.replace(/^#{1,6}\s+.*$/gm, '');
  // Find #tag patterns — common Obsidian tag chars
  const tagRe = /(?<!\w)#([\w一-鿿＀-￯/-]+)/g;
  // Actually, let's be more specific: tags after whitespace or line start
  const tagRe2 = /(?:^|\s)#([\w一-鿿/-]+)/g;
  let m;
  while ((m = tagRe2.exec(noHeadings)) !== null) {
    const tag = m[1];
    // Filter out purely numeric tags
    if (tag && !/^\d+$/.test(tag)) {
      tags.add(tag);
    }
  }
  return [...tags];
}

// ─── Wiki-link conversion ────────────────────────────────────────────────────

/**
 * Convert Obsidian [[wikilinks]] to standard Markdown [text](text) links.
 * - [[Page]]          →  [Page](Page)
 * - [[Page|Alias]]    →  [Alias](Page)
 * - [[Page#section]]  →  [Page#section](Page#section)
 */
function convertWikiLinks(content) {
  return content.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, target, alias) => {
    const display = alias || target;
    return `[${display}](${target})`;
  });
}

// ─── GS-SLAM tag detection ───────────────────────────────────────────────────

/** Returns true if this Reference note should get the "GS-SLAM" tag. */
function shouldAddGSSlam(filename, content) {
  const combined = `${filename} ${content}`.toLowerCase();
  return /\b3dgs\b/.test(combined) ||
    /\bgaussian\b/.test(combined) ||
    /\bslam\b/.test(combined);
}

// ─── Frontmatter generation ──────────────────────────────────────────────────

/**
 * Build YAML frontmatter string for a given piece of content.
 * @param {object} meta
 * @param {string} meta.title
 * @param {string} meta.date       — YYYY-MM-DD
 * @param {string[]} meta.tags
 * @param {string} meta.category
 * @param {'note'|'blog'} meta.type
 */
function buildFrontmatter(meta) {
  const tagsYaml = meta.tags.length > 0
    ? `\ntags:\n${meta.tags.map(t => `  - ${yamlStr(t)}`).join('\n')}`
    : '\ntags: []';

  return [
    '---',
    `title: ${yamlStr(meta.title)}`,
    `date: ${meta.date}`,
    `updated: ${meta.date}`,
    `summary: ${yamlStr(meta.summary)}`,
    tagsYaml,
    `relatedNotes: []`,
    `category: ${yamlStr(meta.category)}`,
    `importance: 2`,
    `draft: false`,
    `type: ${meta.type}`,
    '---\n',
  ].join('\n');
}

// ─── File processing ─────────────────────────────────────────────────────────

/**
 * Process a single Obsidian .md file into the Astro content collection.
 * Returns { status: 'copied' | 'skipped' | 'error', path: string }
 */
function syncFile(srcPath, destDir, syncType) {
  const filename = path.basename(srcPath);
  const lcFilename = filename.toLowerCase();

  try {
    // Read source
    const rawContent = fs.readFileSync(srcPath, 'utf-8');

    // Parse frontmatter from source (for tags etc.)
    const srcFrontmatter = parseFrontmatter(rawContent);
    const fmTags = Array.isArray(srcFrontmatter.tags) ? srcFrontmatter.tags : [];

    // Strip any existing frontmatter from source, then convert wikilinks
    const srcBody = stripFrontmatter(rawContent);
    const convertedBody = convertWikiLinks(srcBody);

    // --- Extract metadata ---
    const title = extractTitle(rawContent) || path.basename(lcFilename, '.md');
    const stat = fs.statSync(srcPath);
    const date = fmtDate(stat.mtime);
    const summary = extractSummary(rawContent);

    // Tags: merge frontmatter tags + inline tags, frontmatter takes priority
    let tags = [];

    // Inline #tags from body
    const inlineTags = extractTags(rawContent);
    tags.push(...inlineTags.filter(t => !tags.includes(t)));

    // Frontmatter tags take priority — add them after dedup
    for (const t of fmTags) {
      const clean = t.trim().replace(/^#/, '');
      if (!tags.includes(clean)) {
        tags.push(clean);
      }
    }

    // GS-SLAM for reference notes (only if not already tagged more specifically)
    if (syncType === 'note' && shouldAddGSSlam(lcFilename, rawContent)) {
      if (!tags.includes('GS-SLAM')) {
        tags.push('GS-SLAM');
      }
    }

    // Category
    let category;
    if (syncType === 'note') {
      category = '文献笔记';
    } else {
      // For blog: use subdirectory name relative to 50_Writing/
      const srcDir = path.dirname(srcPath);
      const base = SOURCE_ROOTS.blog;
      const subDir = path.relative(base, srcDir);
      category = subDir && subDir !== '.' ? subDir : '随笔';
    }

    // --- Build output ---
    const frontmatter = buildFrontmatter({
      title,
      date,
      summary,
      tags,
      category,
      type: syncType,
    });

    const output = frontmatter + '\n' + convertedBody;

    // --- Idempotency check (compare full output) ---
    const srcFullHash = sha256(output);

    const destPath = path.join(destDir, lcFilename);
    if (fs.existsSync(destPath)) {
      const destRaw = fs.readFileSync(destPath, 'utf-8');
      const destFullHash = sha256(destRaw);
      if (srcFullHash === destFullHash) {
        return { status: 'skipped', path: destPath, reason: 'unchanged' };
      }
    }

    // --- Write ---
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destPath, output, 'utf-8');

    return { status: 'copied', path: destPath };
  } catch (err) {
    return { status: 'error', path: srcPath, error: err.message };
  }
}

// ─── Frontmatter stripping ───────────────────────────────────────────────────

/**
 * Strip YAML frontmatter (--- ... ---) from content.
 * Returns the body only. If no frontmatter, returns the full string.
 */
function stripFrontmatter(content) {
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      return content.slice(end + 4).trimStart();
    }
  }
  return content;
}

// ─── Directory traversal ─────────────────────────────────────────────────────

/**
 * Recursively find all .md files in a directory, skipping INDEX.md.
 */
function findMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md') {
      results.push(full);
    }
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('🔁 Syncing Obsidian → Astro content collections...\n');

  const stats = { copied: 0, skipped: 0, errors: 0 };

  for (const [typeKey, srcDir] of Object.entries(SOURCE_ROOTS)) {
    console.log(`📂 Source: ${srcDir}`);

    if (!fs.existsSync(srcDir)) {
      console.log(`   ⚠️  Directory not found, skipping.\n`);
      continue;
    }

    const files = findMdFiles(srcDir);
    console.log(`   Found ${files.length} .md file(s)\n`);

    const destDir = OUTPUT_DIRS[typeKey];

    for (const filePath of files) {
      const result = syncFile(filePath, destDir, typeKey === 'notes' ? 'note' : 'blog');
      const relDest = path.relative(BLOG_ROOT, result.path);

      switch (result.status) {
        case 'copied':
          console.log(`   ✅ Copied  → ${relDest}`);
          stats.copied++;
          break;
        case 'skipped':
          console.log(`   ⏭️  Skipped → ${relDest} (${result.reason})`);
          stats.skipped++;
          break;
        case 'error':
          console.error(`   ❌ Error   → ${result.path}: ${result.error}`);
          stats.errors++;
          break;
      }
    }
    console.log('');
  }

  console.log(`📊 Summary: ${stats.copied} copied, ${stats.skipped} skipped, ${stats.errors} errors`);
}

main();
