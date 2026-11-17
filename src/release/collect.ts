import { GitHubClient } from '../github/client';
import { MergedPRInfo } from './classify';
import { logger } from '../util/logger';

export interface LatestReleaseInfo {
  tagName: string | null;
  publishedAt: string | null;
}

/**
 * Finds the latest published release or tag.
 */
export async function getLatestReleaseOrTag(client: GitHubClient): Promise<LatestReleaseInfo> {
  // 1. Try getLatestRelease
  try {
    const res = await client.octokit.rest.repos.getLatestRelease({
      owner: client.owner,
      repo: client.repo,
    });
    if (res.data) {
      return {
        tagName: res.data.tag_name,
        publishedAt: res.data.published_at || null,
      };
    }
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status !== 404) {
      logger.warn(`Failed to fetch latest release: ${String(err)}`);
    }
  }

  // 2. Fall back to listTags
  try {
    const tags = await client.octokit.rest.repos.listTags({
      owner: client.owner,
      repo: client.repo,
      per_page: 1,
    });

    if (tags.data.length > 0) {
      const latestTag = tags.data[0];
      let commitDate: string | null = null;
      try {
        const commit = await client.octokit.rest.repos.getCommit({
          owner: client.owner,
          repo: client.repo,
          ref: latestTag.commit.sha,
        });
        commitDate = commit.data.commit.author?.date || null;
      } catch {
        commitDate = null;
      }

      return {
        tagName: latestTag.name,
        publishedAt: commitDate,
      };
    }
  } catch (err: unknown) {
    logger.warn(`Failed to fetch tags: ${String(err)}`);
  }

  return { tagName: null, publishedAt: null };
}

/**
 * Collects all merged PRs since the latest release date.
 */
export async function collectMergedPRs(
  client: GitHubClient,
  sinceDate?: string | null,
): Promise<{
  prs: MergedPRInfo[];
  firstTimeContributors: Array<{ author: string; prNumber: number }>;
}> {
  logger.info(`Collecting merged PRs${sinceDate ? ` since ${sinceDate}` : ' across all history'}...`);

  const closedPRs = await client.octokit.paginate(
    client.octokit.rest.pulls.list,
    {
      owner: client.owner,
      repo: client.repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    },
  );

  const sinceTime = sinceDate ? new Date(sinceDate).getTime() : 0;
  const releasePRs: MergedPRInfo[] = [];
  const historicalAuthors = new Set<string>();

  for (const raw of closedPRs) {
    if (!raw.merged_at) continue;

    const mergedTime = new Date(raw.merged_at).getTime();
    const author = raw.user?.login || 'unknown';
    const labels = (raw.labels || []).map((l: { name: string }) => l.name);

    if (mergedTime > sinceTime) {
      releasePRs.push({
        number: raw.number,
        title: raw.title,
        body: raw.body || '',
        author,
        mergedAt: raw.merged_at,
        labels,
      });
    } else {
      historicalAuthors.add(author);
    }
  }

  // Reverse so they are chronological
  releasePRs.reverse();

  // Determine new contributors
  const firstTimeContributors: Array<{ author: string; prNumber: number }> = [];
  const seenNewInRelease = new Set<string>();

  for (const pr of releasePRs) {
    if (!historicalAuthors.has(pr.author) && !seenNewInRelease.has(pr.author) && pr.author !== 'unknown') {
      seenNewInRelease.add(pr.author);
      firstTimeContributors.push({ author: pr.author, prNumber: pr.number });
    }
  }

  logger.info(`Collected ${releasePRs.length} merged PR(s) and ${firstTimeContributors.length} new contributor(s).`);

  return { prs: releasePRs, firstTimeContributors };
}
