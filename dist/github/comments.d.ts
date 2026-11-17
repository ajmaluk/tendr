import { GitHubClient, CommentInfo } from './client';
export declare const COMMENT_MARKERS: {
    readonly TRIAGE_INFO: "<!-- tendr:triage-info -->";
    readonly DUPLICATE_INFO: "<!-- tendr:duplicate-info -->";
    readonly WELCOME_MESSAGE: "<!-- tendr:welcome-message -->";
    readonly PR_REPORT: "<!-- tendr:pr-report -->";
};
/**
 * Finds an existing comment on an issue or PR matching a specific hidden HTML marker.
 * Supports backward-compatible search for legacy maintainerkit markers.
 * Prefers bot comments and sorts by oldest comment ID if multiple exist.
 */
export declare function findCommentByMarker(client: GitHubClient, issueNumber: number, marker: string): Promise<CommentInfo | null>;
/**
 * Posts or updates a sticky comment containing the specified marker.
 * If a comment with the marker exists, it updates it.
 * If none exists, it creates a new comment with the marker prepended.
 * Idempotent: ensures only one comment with that marker exists.
 * Truncates bodies to fit well within GitHub's 65,536-character limit.
 */
export declare function postOrUpdateStickyComment(client: GitHubClient, issueNumber: number, marker: string, content: string): Promise<void>;
