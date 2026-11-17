import { describe, it, expect } from 'vitest';
import { TfIdfSimilarityEngine } from '../src/text/tfidf';

describe('TF-IDF & Cosine Similarity Engine', () => {
  const corpus = [
    {
      id: 1,
      text: 'Database connection pool timeout error during heavy write load',
    },
    {
      id: 2,
      text: 'Button styling misalignment on safari mobile viewport',
    },
    {
      id: 3,
      text: 'Documentation typo in getting started guide step two',
    },
  ];

  it('calculates high similarity for nearly identical topic', () => {
    const engine = new TfIdfSimilarityEngine(corpus);
    const query = 'Database connection timeout error under write load';

    const results = engine.findSimilar(query, 0.4, 3);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(1);
    expect(results[0].score).toBeGreaterThan(0.6);
  });

  it('calculates very low or zero similarity for unrelated topic', () => {
    const engine = new TfIdfSimilarityEngine(corpus);
    const query = 'Add dark mode toggle to navigation navbar';

    const results = engine.findSimilar(query, 0.5, 3);
    expect(results.length).toBe(0);
  });

  it('handles empty query or empty corpus gracefully', () => {
    const emptyEngine = new TfIdfSimilarityEngine([]);
    expect(emptyEngine.findSimilar('crash', 0.5)).toEqual([]);

    const engine = new TfIdfSimilarityEngine(corpus);
    expect(engine.findSimilar('', 0.5)).toEqual([]);
    expect(engine.findSimilar('   ', 0.5)).toEqual([]);
  });
});
