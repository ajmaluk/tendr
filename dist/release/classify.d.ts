import { ReleaseConfig } from '../config/schema';
export interface MergedPRInfo {
    number: number;
    title: string;
    body?: string;
    author: string;
    mergedAt: string;
    labels: string[];
}
export interface ClassifiedPR {
    pr: MergedPRInfo;
    category: string;
    isBreaking: boolean;
    conventionalType: string | null;
}
/**
 * Checks if a PR qualifies as a breaking change based on label, title, or body footer.
 */
export declare function isBreakingChange(pr: MergedPRInfo, parsedType: {
    isBreaking: boolean;
}): boolean;
/**
 * Classifies PRs into configured release categories:
 * Priority order:
 * 1. Category labels mapping
 * 2. Conventional Commit type mapping
 * 3. Fallback to "Other Changes"
 */
export declare function classifyPullRequests(prs: MergedPRInfo[], config: ReleaseConfig): {
    classified: ClassifiedPR[];
    breakingCount: number;
};
