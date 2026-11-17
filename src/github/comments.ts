import { GitHubClient, CommentInfo } from './client';
import { logger } from '../util/logger';

export const COMMENT_MARKERS = {
  TRIAGE_INFO: '<!-- maintainerkit:triage-info -->',
  DUPLICATE_INFO: '<!-- maintainerkit:duplicate-info -->',
  WELCOME_MESSAGE: '<!-- maintainerkit:welcome-message -->',
  PR_REPORT: '<!-- maintainerkit:pr-report -->',
} as const;

/**
 * Finds an existing comment on an issue or PR matching a specific hidden HTML marker.
 */
export async function findCommentByMarker(
  client: GitHubClient,
  issueNumber: number,
  marker: string,
): Promise<CommentInfo | null> {
  const comments = await client.listComments(issueNumber);
  const found = comments.find((c) => c.body && c.body.includes(marker));
  return found || null;
}

/**
 * Posts or updates a sticky comment containing the specified marker.
 * If a comment with the marker exists, it updates it.
 * If none exists, it creates a new comment with the marker prepended.
 * Idempotent: ensures only one comment with that marker exists.
 */
export async function postOrUpdateStickyComment(
  client: GitHubClient,
  issueNumber: number,
  marker: string,
  content: string,
): Promise<void> {
  const fullBody = `${marker}\n${content.trim()}`;
  const existing = await findCommentByMarker(client, issueNumber, marker);

  if (existing) {
    if (existing.body?.trim() === fullBody.trim()) {
      logger.info(`Comment with marker ${marker} is already up to date on #${issueNumber}.`);
      return;
    }
    logger.info(`Updating existing comment #${existing.id} on #${issueNumber}`);
    await client.updateComment(existing.id, fullBody);
  } else {
    logger.info(`Creating new comment with marker ${marker} on #${issueNumber}`);
    await client.createComment(issueNumber, fullBody);
  }
}
