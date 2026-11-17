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
export declare class TfIdfSimilarityEngine {
    private documents;
    private documentFrequency;
    private totalDocuments;
    constructor(corpus: Array<{
        id: number;
        text: string;
    }>);
    /**
     * Computes the Inverse Document Frequency (IDF) with smooth damping.
     */
    private getIdf;
    /**
     * Builds a normalized TF-IDF vector map for a given term-count map.
     */
    private buildVector;
    /**
     * Finds the most similar documents to the query text, sorted by score descending.
     */
    findSimilar(queryText: string, minThreshold?: number, maxResults?: number): SimilarityResult[];
}
