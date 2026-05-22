export function estimateReadingTime(content: string): number {
  const plainChinese = content.replace(/[^一-鿿]/g, '');
  const plainEnglish = content.replace(/[^\x00-\x7F]/g, '').trim();
  const enWords = plainEnglish.length ? plainEnglish.split(/\s+/).filter(Boolean).length : 0;
  const score = plainChinese.length * 1.2 + enWords;
  return Math.max(1, Math.round(score / 500));
}
