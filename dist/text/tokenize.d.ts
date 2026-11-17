/**
 * Standard English stopwords to filter out for TF-IDF duplicate detection.
 */
export declare const STOPWORDS: Set<string>;
/**
 * Normalizes and tokenizes text:
 * - Strips code blocks, URLs, and markdown formatting
 * - Lowercases and splits on non-word characters
 * - Filters out stopwords and short tokens (< 2 characters)
 */
export declare function tokenize(text: string): string[];
/**
 * Counts token frequencies in a token array.
 */
export declare function countTokens(tokens: string[]): Map<string, number>;
