import { GitHubClient, sanitizeUserText } from '../github/client';
import { COMMENT_MARKERS, postOrUpdateStickyComment } from '../github/comments';
import { TfIdfSimilarityEngine } from '../text/tfidf';
import { logger } from '../util/logger';
import { stepSummary } from '../util/summary';

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
export async function detectDuplicateIssues(
  options: DuplicateDetectionOptions,
): Promise<DuplicateIssueMatch[]> {
  const {
    client,
    currentIssueNumber,
    title,
    body,
    threshold,
    maxSuggestions,
    includeClosedDays,
  } = options;

  logger.info(`Checking duplicates for issue #${currentIssueNumber} (threshold: ${threshold})`);

  let sinceDate: string | undefined;
  if (includeClosedDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() - includeClosedDays);
    sinceDate = d.toISOString();
  }

  // Fetch candidate issues
  let candidateIssues: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    candidateIssues = await client.listIssues({
      state: 'all',
      since: sinceDate,
    });
  } catch (err: unknown) {
    logger.warn(`Failed to retrieve candidate issues for duplicate check: ${String(err)}`);
    return [];
  }

  // Filter out PRs and current issue
  const issueMap = new Map<number, { title: string; state: string }>();
  const corpus: Array<{ id: number; text: string }> = [];

  for (const candidate of candidateIssues) {
    // GitHub API returns PRs in issues endpoint if 'pull_request' field is present
    if (candidate.pull_request) continue;
    if (candidate.number === currentIssueNumber) continue;

    issueMap.set(candidate.number, {
      title: candidate.title || '',
      state: candidate.state || 'open',
    });

    corpus.push({
      id: candidate.number,
      text: `${candidate.title || ''}\n${candidate.body || ''}`,
    });
  }

  if (corpus.length === 0) {
    logger.info('No candidate issues available for duplicate comparison.');
    return [];
  }

  const engine = new TfIdfSimilarityEngine(corpus);
  const queryText = `${title}\n${body || ''}`;
  const rawMatches = engine.findSimilar(queryText, threshold, maxSuggestions);

  const matches: DuplicateIssueMatch[] = rawMatches.map((m) => {
    const info = issueMap.get(m.id);
    return {
      number: m.id,
      title: info ? info.title : `Issue #${m.id}`,
      state: info ? info.state : 'open',
      score: m.score,
    };
  });

  if (matches.length > 0) {
    logger.info(
      `Found ${matches.length} potential duplicate(s) for #${currentIssueNumber}: ${matches
        .map((m) => `#${m.number} (${Math.round(m.score * 100)}%)`)
        .join(', ')}`,
    );

    const commentBody = [
      '### 🔍 Potential Duplicate Issues Detected',
      '',
      `MaintainerKit detected that this issue may be related to or a duplicate of the following existing issues:`,
      '',
      ...matches.map((m) => {
        const cleanTitle = sanitizeUserText(m.title);
        const percent = Math.round(m.score * 100);
        const stateBadge = m.state === 'open' ? '🟢 Open' : '🟣 Closed';
        return `- #${m.number} **${cleanTitle}** (${percent}% match, ${stateBadge})`;
      }),
      '',
      'Please check if your problem or suggestion is already covered in these issues.',
      '',
      '> *Note: MaintainerKit never closes issues automatically. A human maintainer will review this issue.*',
    ].join('\n');

    await postOrUpdateStickyComment(
      client,
      currentIssueNumber,
      COMMENT_MARKERS.DUPLICATE_INFO,
      commentBody,
    );

    await client.addLabels(currentIssueNumber, ['possible-duplicate']);

    stepSummary.addItem({
      type: 'duplicate',
      title: `Potential duplicates for #${currentIssueNumber}`,
      details: matches.map((m) => `#${m.number}`).join(', '),
      status: client.dryRun ? 'would-apply' : 'applied',
    });
  }

  return matches;
}
