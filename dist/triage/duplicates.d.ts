import { GitHubClient } from '../github/client';
export interface DuplicateIssueMatch {
    number: number;
    title: string;
    state: string;
    score: number;
}
export interface DuplicateDetectionOptions {
    client: GitHubClient;
    currentIssueNumber: number;
    title: string;
    body?: string;
    threshold: number;
    maxSuggestions: number;
    includeClosedDays: number;
}
/**
 * Searches for existing issues that are semantically similar to the current issue.
 * Never closes the issue; only posts informative comment and adds label.
 */
export declare function detectDuplicateIssues(options: DuplicateDetectionOptions): Promise<DuplicateIssueMatch[]>;
