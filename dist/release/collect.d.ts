import { GitHubClient } from '../github/client';
import { MergedPRInfo } from './classify';
export interface LatestReleaseInfo {
    tagName: string | null;
    publishedAt: string | null;
}
/**
 * Finds the latest published release or tag, ignoring moving major tags (e.g. v1).
 */
export declare function getLatestReleaseOrTag(client: GitHubClient): Promise<LatestReleaseInfo>;
/**
 * Collects all merged PRs since the latest release date.
 * Automatically stops paginating once PR updated_at is older than sinceDate.
 */
export declare function collectMergedPRs(client: GitHubClient, sinceDate?: string | null, options?: {
    excludeBots?: boolean;
}): Promise<{
    prs: MergedPRInfo[];
    firstTimeContributors: Array<{
        author: string;
        prNumber: number;
    }>;
}>;
