import { GitHubClient, CommentInfo } from './client';
export declare const COMMENT_MARKERS: {
    readonly TRIAGE_INFO: "<!-- maintainerkit:triage-info -->";
    readonly DUPLICATE_INFO: "<!-- maintainerkit:duplicate-info -->";
    readonly WELCOME_MESSAGE: "<!-- maintainerkit:welcome-message -->";
    readonly PR_REPORT: "<!-- maintainerkit:pr-report -->";
};
/**
 * Finds an existing comment on an issue or PR matching a specific hidden HTML marker.
 */
export declare function findCommentByMarker(client: GitHubClient, issueNumber: number, marker: string): Promise<CommentInfo | null>;
/**
 * Posts or updates a sticky comment containing the specified marker.
 * If a comment with the marker exists, it updates it.
 * If none exists, it creates a new comment with the marker prepended.
 * Idempotent: ensures only one comment with that marker exists.
 */
export declare function postOrUpdateStickyComment(client: GitHubClient, issueNumber: number, marker: string, content: string): Promise<void>;
