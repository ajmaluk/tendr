import { tokenize, countTokens } from './tokenize';

export interface DocumentEntry {
  id: number;
  tokens: string[];
  tokenCounts: Map<string, number>;
}

export interface SimilarityResult {
  id: number;
  score: number;
}

/**
 * Lightweight in-memory TF-IDF and Cosine Similarity engine for duplicate issue detection.
 */
export class TfIdfSimilarityEngine {
  private documents: DocumentEntry[] = [];
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments = 0;

  constructor(corpus: Array<{ id: number; text: string }>) {
    for (const item of corpus) {
      const tokens = tokenize(item.text);
      if (tokens.length === 0) continue;

      const tokenCounts = countTokens(tokens);
      this.documents.push({
        id: item.id,
        tokens,
        tokenCounts,
      });

      // Update document frequencies for unique terms in this document
      for (const term of tokenCounts.keys()) {
        this.documentFrequency.set(
          term,
          (this.documentFrequency.get(term) || 0) + 1,
        );
      }
    }
    this.totalDocuments = this.documents.length;
  }

  /**
   * Computes the Inverse Document Frequency (IDF) with smooth damping.
   */
  private getIdf(term: string): number {
    const df = this.documentFrequency.get(term) || 0;
    // Standard smooth IDF formula
    return Math.log(1 + this.totalDocuments / (df + 1)) + 1;
  }

  /**
   * Builds a normalized TF-IDF vector map for a given term-count map.
   */
  private buildVector(termCounts: Map<string, number>, totalTokens: number): Map<string, number> {
    const vector = new Map<string, number>();
    if (totalTokens === 0) return vector;

    let sumSq = 0;
    for (const [term, count] of termCounts.entries()) {
      // Sublinear term frequency
      const tf = 1 + Math.log(count);
      const idf = this.getIdf(term);
      const weight = tf * idf;
      vector.set(term, weight);
      sumSq += weight * weight;
    }

    // L2 Normalization
    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (const [term, weight] of vector.entries()) {
        vector.set(term, weight / norm);
      }
    }

    return vector;
  }

  /**
   * Finds the most similar documents to the query text, sorted by score descending.
   */
  findSimilar(queryText: string, minThreshold = 0.55, maxResults = 3): SimilarityResult[] {
    const queryTokens = tokenize(queryText);
    if (queryTokens.length === 0 || this.totalDocuments === 0) {
      return [];
    }

    const queryCounts = countTokens(queryTokens);
    const queryVector = this.buildVector(queryCounts, queryTokens.length);

    const scores: SimilarityResult[] = [];

    for (const doc of this.documents) {
      const docVector = this.buildVector(doc.tokenCounts, doc.tokens.length);

      // Dot product of L2-normalized vectors is the cosine similarity
      let dotProduct = 0;
      for (const [term, qWeight] of queryVector.entries()) {
        const dWeight = docVector.get(term);
        if (dWeight !== undefined) {
          dotProduct += qWeight * dWeight;
        }
      }

      if (dotProduct >= minThreshold) {
        scores.push({
          id: doc.id,
          score: Math.round(dotProduct * 1000) / 1000,
        });
      }
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, maxResults);
  }
}
