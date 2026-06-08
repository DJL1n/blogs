import fs from 'node:fs';

// Read .env and parse KIMI_API_KEY
const envRaw = fs.readFileSync('/Users/a0000/.hermes/.env', 'utf-8');
let API_KEY = '';
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('KIMI_API_KEY=')) {
    API_KEY = trimmed.split('=', 2)[1].trim();
    break;
  }
}
console.error('API_KEY loaded:', API_KEY ? API_KEY.slice(0, 8) + '...' : 'EMPTY');

const BASE_URL = 'https://api.moonshot.cn/v1';

const SCREENSHOTS = ['home', 'notes', 'tags', 'detail'];

const content = [
  {
    type: 'text',
    text: `以下是个人知识博客"山不见我"的白日模式截图。请从视觉设计角度分析并给出具体改进建议。

截图顺序：1=首页, 2=笔记列表, 3=标签页, 4=文章详情页

这个博客的目标读者是SLAM/3DGS领域的研究者，内容偏学术技术方向。

需要你评估的方面：
1. **配色**：当前是白天模式，请给出低饱和莫兰迪色系的配色方案
2. 排版/间距是否合理
3. 信息层级是否清晰
4. 具体改进方案（颜色值、布局建议等）
5. 缺少什么动态交互效果

请针对每个页面分别给建议，最后给一个整体改进方案。用中文回答。`,
  },
];

for (const name of SCREENSHOTS) {
  const buf = fs.readFileSync(`/tmp/blog-${name}.png`);
  const b64 = buf.toString('base64');
  content.push({
    type: 'image_url',
    image_url: { url: `data:image/png;base64,${b64}` },
  });
}

const body = JSON.stringify({
  model: 'kimi-k2.5', // k2.6 not found, fallback to k2.5
  messages: [{ role: 'user', content }],
  temperature: 1,
  max_tokens: 4096,
});

console.error('Sending to Kimi API...');

const res = await fetch(`${BASE_URL}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  },
  body,
});

const data = await res.json();
const text = data?.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
console.log(text);
