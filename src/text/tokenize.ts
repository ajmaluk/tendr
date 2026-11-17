/**
 * Standard English stopwords to filter out for TF-IDF duplicate detection.
 */
export const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'just', 'me', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 's', 'same', 'she', 'should', 'so', 'some', 'such',
  't', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves',
]);

/**
 * Normalizes and tokenizes text:
 * - Strips code blocks, URLs, and markdown formatting
 * - Lowercases and splits on non-word characters
 * - Filters out stopwords and short tokens (< 2 characters)
 */
export function tokenize(text: string): string[] {
  if (!text) return [];

  // 1. Remove markdown code blocks (```...``` and `...`)
  let cleaned = text.replace(/```[\s\S]*?```/g, ' ');
  cleaned = cleaned.replace(/`[^`]+`/g, ' ');

  // 2. Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, ' ');

  // 3. Remove HTML tags and comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, ' ');
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // 4. Lowercase and replace non-alphanumeric with spaces
  const words = cleaned.toLowerCase().split(/[^a-z0-9_]+/);

  const tokens: string[] = [];
  for (const word of words) {
    if (word.length >= 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word)) {
      tokens.push(word);
    }
  }

  return tokens;
}

/**
 * Counts token frequencies in a token array.
 */
export function countTokens(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return counts;
}
