import { GitHubClient } from '../github/client';
import { MergedPRInfo } from './classify';
export interface LatestReleaseInfo {
    tagName: string | null;
    publishedAt: string | null;
}
/**
 * Finds the latest published release or tag.
 */
export declare function getLatestReleaseOrTag(client: GitHubClient): Promise<LatestReleaseInfo>;
/**
 * Collects all merged PRs since the latest release date.
 */
export declare function collectMergedPRs(client: GitHubClient, sinceDate?: string | null): Promise<{
    prs: MergedPRInfo[];
    firstTimeContributors: Array<{
        author: string;
        prNumber: number;
    }>;
}>;
