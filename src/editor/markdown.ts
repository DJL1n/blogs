// ── Markdown serializer (TipTap JSON → Markdown) ──

function serializeInline(nodes: any[]): string {
  if (!nodes || nodes.length === 0) return '';
  let md = '';
  for (const node of nodes) {
    if (node.type === 'text') {
      let text = node.text || '';
      if (node.marks) {
        const linkMark = node.marks.find((m: any) => m.type === 'link');
        const otherMarks = node.marks.filter((m: any) => m.type !== 'link');
        for (const mark of otherMarks) {
          switch (mark.type) {
            case 'bold': text = `**${text}**`; break;
            case 'italic': text = `*${text}*`; break;
            case 'strike': text = `~~${text}~~`; break;
            case 'code': text = `\`${text}\``; break;
          }
        }
        if (linkMark) {
          text = `[${text}](${linkMark.attrs?.href || ''})`;
        }
      }
      md += text;
    } else if (node.type === 'hardBreak') {
      md += '\n';
    } else if (node.type === 'image') {
      md += `![${node.attrs?.alt || ''}](${node.attrs?.src || ''})`;
    }
  }
  return md;
}

function getTextContent(node: any): string {
  if (!node.content) return '';
  return node.content.map((n: any) => (n.type === 'text' ? n.text : getTextContent(n))).join('');
}

function serializeNode(node: any): string {
  const inline = serializeInline(node.content || []);

  switch (node.type) {
    case 'paragraph':
      return inline || '';
    case 'heading':
      return '#'.repeat(node.attrs?.level || 1) + ' ' + inline;
    case 'bulletList':
      return (node.content || [])
        .map((li: any) => '- ' + serializeInline(li.content || []))
        .join('\n');
    case 'orderedList':
      return (node.content || [])
        .map((li: any, i: number) => `${i + 1}. ` + serializeInline(li.content || []))
        .join('\n');
    case 'taskList':
      return (node.content || [])
        .map((li: any) => {
          const checked = li.attrs?.checked ? 'x' : ' ';
          return '- [' + checked + '] ' + serializeInline(li.content || []);
        })
        .join('\n');
    case 'listItem':
      return inline;
    case 'taskItem':
      return inline;
    case 'blockquote':
      return inline
        .split('\n')
        .map((line) => '> ' + line)
        .join('\n');
    case 'codeBlock':
      return '```' + (node.attrs?.language || '') + '\n' + getTextContent(node) + '\n```';
    case 'horizontalRule':
      return '---';
    case 'image':
      return `![${node.attrs?.alt || ''}](${node.attrs?.src || ''})`;
    case 'hardBreak':
      return '\n';
    default:
      return inline;
  }
}

export function editorToMarkdown(editor: any): string {
  const doc = editor.getJSON();
  if (!doc.content || doc.content.length === 0) return '';
  return (
    doc.content
      .map(serializeNode)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  );
}

// ── Simple Markdown → HTML for loading existing content ──

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMdToHtml(s: string): string {
  let t = escapeHtml(s);
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  return t;
}

export function simpleMdToHtml(md: string): string {
  if (!md) return '<p></p>';
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      i++;
      const code: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        i++;
      }
      i++;
      out.push(`<pre><code${lang ? ` data-lang="${lang}"` : ''}>${code.join('\n')}</code></pre>`);
      continue;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      out.push(`<h${hMatch[1].length}>${escapeHtml(hMatch[2])}</h${hMatch[1].length}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quotes: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quotes.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push('<blockquote><p>' + quotes.join('<br>') + '</p></blockquote>');
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push('<li>' + inlineMdToHtml(lines[i].replace(/^[-*]\s+/, '')) + '</li>');
        i++;
      }
      if (items.some((item) => item.includes('<li>['))) {
        out.push('<ul data-type="taskList">' + items.join('') + '</ul>');
      } else {
        out.push('<ul>' + items.join('') + '</ul>');
      }
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push('<li>' + inlineMdToHtml(lines[i].replace(/^\d+\.\s+/, '')) + '</li>');
        i++;
      }
      out.push('<ol>' + items.join('') + '</ol>');
      continue;
    }

    if (!line.trim()) {
      out.push('<p><br></p>');
      i++;
      continue;
    }

    out.push('<p>' + inlineMdToHtml(line) + '</p>');
    i++;
  }
  return out.join('\n');
}
