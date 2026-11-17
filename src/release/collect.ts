import { GitHubClient } from '../github/client';
import { MergedPRInfo } from './classify';
import { logger } from '../util/logger';
import { compareSemver } from './semver';

export interface LatestReleaseInfo {
  tagName: string | null;
  publishedAt: string | null;
}

const SEMVER_TAG_REGEX = /^v?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/**
 * Finds the latest published release or tag, ignoring moving major tags (e.g. v1).
 */
export async function getLatestReleaseOrTag(client: GitHubClient): Promise<LatestReleaseInfo> {
  // 1. Try getLatestRelease
  try {
    const res = await client.octokit.rest.repos.getLatestRelease({
      owner: client.owner,
      repo: client.repo,
    });
    if (res.data && res.data.tag_name && SEMVER_TAG_REGEX.test(res.data.tag_name)) {
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

  // 2. Fall back to listTags (paginate up to 200 tags, filter strictly by semver)
  try {
    const allTags: Array<{ name: string; commit: { sha: string } }> = [];
    for (let page = 1; page <= 2; page++) {
      const tagsRes = await client.octokit.rest.repos.listTags({
        owner: client.owner,
        repo: client.repo,
        per_page: 100,
        page,
      });
      const tags = tagsRes.data || [];
      allTags.push(...tags);
      if (tags.length < 100) break;
    }

    // Keep only true semver tags (v1.0.0, 1.2.3), ignore moving tags like "v1"
    const semverTags = allTags.filter((t) => SEMVER_TAG_REGEX.test(t.name));

    if (semverTags.length > 0) {
      semverTags.sort((a, b) => compareSemver(b.name, a.name));
      const latestTag = semverTags[0];
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
 * Automatically stops paginating once PR updated_at is older than sinceDate.
 */
export async function collectMergedPRs(
  client: GitHubClient,
  sinceDate?: string | null,
  options?: { excludeBots?: boolean },
): Promise<{
  prs: MergedPRInfo[];
  firstTimeContributors: Array<{ author: string; prNumber: number }>;
}> {
  logger.info(`Collecting merged PRs${sinceDate ? ` since ${sinceDate}` : ' across all history'}...`);

  const sinceTime = sinceDate ? new Date(sinceDate).getTime() : 0;
  const releasePRs: MergedPRInfo[] = [];
  const authorPRMap = new Map<string, number>();
  const authorTypeMap = new Map<string, string>();
  const historicalAuthors = new Set<string>();

  const isBotUser = (login?: string, type?: string): boolean => {
    return type === 'Bot' || Boolean(login && login.endsWith('[bot]'));
  };

  let page = 1;
  const MAX_PAGES = 10;
  let reachedEndOfWindow = false;

  while (page <= MAX_PAGES && !reachedEndOfWindow) {
    let closedPRs: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (typeof client.octokit.rest?.pulls?.list === 'function') {
      try {
        const res = await client.octokit.rest.pulls.list({
          owner: client.owner,
          repo: client.repo,
          state: 'closed',
          sort: 'updated',
          direction: 'desc',
          per_page: 100,
          page,
        });
        if (res && Array.isArray(res.data)) {
          closedPRs = res.data;
        }
      } catch (err: unknown) {
        logger.warn(`Failed to fetch closed PRs page ${page}: ${String(err)}`);
      }
    }

    // Fallback if pulls.list was not mocked or returned nothing on first page, but paginate is mocked
    if (page === 1 && closedPRs.length === 0 && typeof client.octokit.paginate === 'function') {
      try {
        const paginated = await client.octokit.paginate(
          client.octokit.rest?.pulls?.list || 'pulls.list',
          {
            owner: client.owner,
            repo: client.repo,
            state: 'closed',
            sort: 'updated',
            direction: 'desc',
            per_page: 100,
          },
        );
        if (Array.isArray(paginated) && paginated.length > 0) {
          closedPRs = paginated;
          reachedEndOfWindow = true;
        }
      } catch {
        // ignore
      }
    }

    if (closedPRs.length === 0) break;

    for (const raw of closedPRs) {
      const author = raw.user?.login || 'unknown';
      const userType = raw.user?.type || 'User';
      const isBot = isBotUser(author, userType);

      // Early stop optimization: pulls are sorted by updated desc.
      // If updated_at is older than sinceDate, no subsequent PR was updated or merged after sinceDate.
      if (sinceTime > 0 && raw.updated_at) {
        const updatedTime = new Date(raw.updated_at).getTime();
        if (updatedTime < sinceTime) {
          reachedEndOfWindow = true;
          break;
        }
      }

      if (!raw.merged_at) continue;

      const mergedTime = new Date(raw.merged_at).getTime();
      const labels = (raw.labels || []).map((l: { name: string }) => l.name);

      if (sinceTime === 0 || mergedTime > sinceTime) {
        if (options?.excludeBots && isBot) {
          // Drop bot PR entirely from release notes if excludeBots is true
          continue;
        }

        releasePRs.push({
          number: raw.number,
          title: raw.title,
          body: raw.body || '',
          author,
          mergedAt: raw.merged_at,
          labels,
        });

        if (!authorPRMap.has(author)) {
          authorPRMap.set(author, raw.number);
          authorTypeMap.set(author, userType);
        }
      } else {
        historicalAuthors.add(author);
      }
    }

    if (closedPRs.length < 100) break;
    page++;
  }

  // Reverse to make chronological
  releasePRs.reverse();

  // Determine first-time contributors (exclude bot accounts)
  const firstTimeContributors: Array<{ author: string; prNumber: number }> = [];
  const candidateAuthors = Array.from(authorPRMap.entries());

  for (const [author, prNumber] of candidateAuthors) {
    const userType = authorTypeMap.get(author);
    if (isBotUser(author, userType) || author === 'unknown') {
      continue;
    }

    if (!sinceDate) {
      firstTimeContributors.push({ author, prNumber });
    } else {
      // If historicalAuthors already recorded author from earlier closed PR, skip
      if (historicalAuthors.has(author)) {
        continue;
      }
      // Check prior commits before sinceDate for this author (cap lookups to prevent rate limit)
      if (firstTimeContributors.length < 50 && client.octokit?.rest?.repos?.listCommits) {
        try {
          const priorCommits = await client.octokit.rest.repos.listCommits({
            owner: client.owner,
            repo: client.repo,
            author,
            until: sinceDate,
            per_page: 1,
          });
          if (priorCommits.data && priorCommits.data.length === 0) {
            firstTimeContributors.push({ author, prNumber });
          }
        } catch {
          // If commit lookup fails, assume first-time contributor if not in historicalAuthors
          firstTimeContributors.push({ author, prNumber });
        }
      } else {
        firstTimeContributors.push({ author, prNumber });
      }
    }
  }

  logger.info(`Collected ${releasePRs.length} merged PR(s) and ${firstTimeContributors.length} new contributor(s).`);

  return { prs: releasePRs, firstTimeContributors };
}
