import { GitHubClient, CommentInfo } from './client';
import { logger } from '../util/logger';

export const COMMENT_MARKERS = {
  TRIAGE_INFO: '<!-- tendr:triage-info -->',
  DUPLICATE_INFO: '<!-- tendr:duplicate-info -->',
  WELCOME_MESSAGE: '<!-- tendr:welcome-message -->',
  PR_REPORT: '<!-- tendr:pr-report -->',
} as const;

function getMarkerVariants(marker: string): string[] {
  const match = marker.match(/<!--\s*(?:tendr|maintainerkit):([a-z0-9_-]+)\s*-->/i);
  if (match) {
    const key = match[1];
    return [`<!-- tendr:${key} -->`, `<!-- maintainerkit:${key} -->`];
  }
  return [marker];
}

/**
 * Finds an existing comment on an issue or PR matching a specific hidden HTML marker.
 * Supports backward-compatible search for legacy maintainerkit markers.
 * Prefers bot comments and sorts by oldest comment ID if multiple exist.
 */
export async function findCommentByMarker(
  client: GitHubClient,
  issueNumber: number,
  marker: string,
): Promise<CommentInfo | null> {
  const comments = await client.listComments(issueNumber);
  const variants = getMarkerVariants(marker);

  const matches = comments.filter((c) =>
    c.body && variants.some((v) => c.body?.includes(v)),
  );

  if (matches.length === 0) return null;

  const isBot = (c: CommentInfo) =>
    c.user?.type === 'Bot' || Boolean(c.user?.login?.endsWith('[bot]'));

  matches.sort((a, b) => {
    const aBot = isBot(a) ? 1 : 0;
    const bBot = isBot(b) ? 1 : 0;
    if (aBot !== bBot) return bBot - aBot; // Bot comments prioritized
    return a.id - b.id; // Oldest first
  });

  if (matches.length > 1) {
    logger.warn(
      `Found ${matches.length} comments matching marker "${marker}" on #${issueNumber}. Updating oldest (#${matches[0].id}).`,
    );
  }

  return matches[0];
}

/**
 * Posts or updates a sticky comment containing the specified marker.
 * If a comment with the marker exists, it updates it.
 * If none exists, it creates a new comment with the marker prepended.
 * Idempotent: ensures only one comment with that marker exists.
 * Truncates bodies to fit well within GitHub's 65,536-character limit.
 */
export async function postOrUpdateStickyComment(
  client: GitHubClient,
  issueNumber: number,
  marker: string,
  content: string,
): Promise<void> {
  let fullBody = `${marker}\n${content.trim()}`;
  const MAX_COMMENT_LENGTH = 60000;
  if (fullBody.length > MAX_COMMENT_LENGTH) {
    const truncationNote = '\n\n*(Note: Comment content truncated to fit GitHub size limits [truncated])*';
    fullBody = fullBody.slice(0, MAX_COMMENT_LENGTH - truncationNote.length) + truncationNote;
  }

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
