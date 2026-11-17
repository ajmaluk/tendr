import * as fs from 'fs';
import * as github from '@actions/github';
import { logger } from '../util/logger';
import { stepSummary } from '../util/summary';

export type OctokitInstance = ReturnType<typeof github.getOctokit>;

export interface RepoContext {
  owner: string;
  repo: string;
}

export interface CommentInfo {
  id: number;
  body?: string;
  user?: {
    login: string;
    type?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface PullRequestFileInfo {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface GitHubClientOptions {
  token: string;
  repoContext?: RepoContext;
  dryRun?: boolean;
  octokit?: OctokitInstance;
}

/**
 * Neutralizes markdown mentions and special characters to prevent accidental user pings or injection.
 */
export function sanitizeUserText(text: string): string {
  // Insert zero-width space after '@' if followed by alphanumeric characters or dashes
  return text.replace(/@([a-zA-Z0-9_-]+)/g, '@\u200B$1');
}

/**
 * GitHub API Client with dry-run protection, retry handling for rate limits,
 * and least-privilege operations.
 */
export class GitHubClient {
  public readonly octokit: OctokitInstance;
  public readonly owner: string;
  public readonly repo: string;
  public readonly dryRun: boolean;

  constructor(options: GitHubClientOptions) {
    this.dryRun = Boolean(options.dryRun);
    this.octokit = options.octokit || github.getOctokit(options.token);

    if (options.repoContext) {
      this.owner = options.repoContext.owner;
      this.repo = options.repoContext.repo;
    } else if (github.context.repo) {
      this.owner = github.context.repo.owner;
      this.repo = github.context.repo.repo;
    } else {
      this.owner = '';
      this.repo = '';
    }
  }

  /**
   * Safe API call wrapper with retries on rate limits (429 or rate-limited 403s).
   * Non-rate-limit 403s (e.g. permission errors) fail immediately with clear instructions.
   */
  private async requestWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;
    let delayMs = 1000;

    while (attempt < maxRetries) {
      try {
        return await fn();
      } catch (err: unknown) {
        attempt++;
        const errObj = err as {
          status?: number;
          message?: string;
          response?: { headers?: Record<string, string | undefined> };
        };
        const status = errObj?.status;
        const headers = errObj?.response?.headers || {};
        const msg = String(errObj?.message || '').toLowerCase();

        const remaining = headers['x-ratelimit-remaining'];
        const retryAfter = headers['retry-after'];
        const isRateLimitMsg = msg.includes('rate limit') || msg.includes('secondary rate limit');

        const isRateLimit =
          status === 429 ||
          (status === 403 && (remaining === '0' || Boolean(retryAfter) || isRateLimitMsg));

        if (status === 403 && !isRateLimit) {
          throw new Error(
            `GitHub returned 403 (${errObj?.message || 'Forbidden'}). Check the workflow permissions: issues: write, pull-requests: write, contents: read.`,
          );
        }

        if (isRateLimit && attempt < maxRetries) {
          let waitMs = delayMs;
          if (retryAfter) {
            const parsed = parseInt(retryAfter, 10);
            if (!isNaN(parsed) && parsed > 0) {
              waitMs = Math.min(60000, parsed * 1000);
            }
          } else if (headers['x-ratelimit-reset'] && remaining === '0') {
            const resetSec = parseInt(headers['x-ratelimit-reset'], 10);
            if (!isNaN(resetSec)) {
              const diff = resetSec * 1000 - Date.now();
              if (diff > 0) {
                waitMs = Math.min(60000, Math.max(1000, diff));
              }
            }
          }

          logger.warn(
            `GitHub API rate limit or secondary limit hit (status ${status}). Retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          delayMs *= 2;
          continue;
        }
        throw err;
      }
    }
    throw new Error('Exceeded maximum API retries');
  }

  /**
   * Fetches content of a file from repository. Returns null if file does not exist (404).
   */
  async getFileContent(filePath: string): Promise<string | null> {
    // 1. Check local filesystem first (saves API rate limit calls in local runs & checked-out workspaces)
    if (fs.existsSync(filePath)) {
      try {
        return fs.readFileSync(filePath, 'utf8');
      } catch {
        // proceed to API fetch
      }
    }

    try {
      const response = await this.requestWithRetry(() =>
        this.octokit.rest.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: filePath,
        }),
      );

      const data = response.data;
      if (typeof data === 'object' && data !== null && 'content' in data && 'encoding' in data) {
        const fileData = data as { content: string; encoding: string };
        if (fileData.encoding === 'base64') {
          return Buffer.from(fileData.content, 'base64').toString('utf8');
        }
      }
      return null;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Adds labels to an issue or pull request.
   */
  async addLabels(issueNumber: number, labels: string[]): Promise<string[]> {
    if (labels.length === 0) return [];

    if (this.dryRun) {
      logger.info(`[DRY-RUN] Would add labels to #${issueNumber}: ${labels.join(', ')}`);
      stepSummary.addItem({
        type: 'label',
        title: `Add labels to #${issueNumber}`,
        details: labels.join(', '),
        status: 'would-apply',
      });
      return labels;
    }

    try {
      await this.requestWithRetry(() =>
        this.octokit.rest.issues.addLabels({
          owner: this.owner,
          repo: this.repo,
          issue_number: issueNumber,
          labels,
        }),
      );
      logger.info(`Added labels to #${issueNumber}: ${labels.join(', ')}`);
      stepSummary.addItem({
        type: 'label',
        title: `Added labels to #${issueNumber}`,
        details: labels.join(', '),
        status: 'applied',
      });
      return labels;
    } catch (err: unknown) {
      logger.error(`Failed to add labels to #${issueNumber}: ${String(err)}`);
      stepSummary.addItem({
        type: 'label',
        title: `Add labels to #${issueNumber}`,
        details: `Failed: ${String(err)}`,
        status: 'failed',
      });
      throw err;
    }
  }

  /**
   * Removes a label from an issue or pull request.
   */
  async removeLabel(issueNumber: number, label: string): Promise<boolean> {
    if (this.dryRun) {
      logger.info(`[DRY-RUN] Would remove label from #${issueNumber}: ${label}`);
      stepSummary.addItem({
        type: 'label',
        title: `Remove label from #${issueNumber}`,
        details: label,
        status: 'would-apply',
      });
      return true;
    }

    try {
      await this.requestWithRetry(() =>
        this.octokit.rest.issues.removeLabel({
          owner: this.owner,
          repo: this.repo,
          issue_number: issueNumber,
          name: label,
        }),
      );
      logger.info(`Removed label from #${issueNumber}: ${label}`);
      stepSummary.addItem({
        type: 'label',
        title: `Removed label from #${issueNumber}`,
        details: label,
        status: 'applied',
      });
      return true;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      // 404 means label wasn't attached; treat as non-fatal
      if (status === 404) {
        return false;
      }
      logger.warn(`Could not remove label "${label}" on #${issueNumber}: ${String(err)}`);
      return false;
    }
  }

  /**
   * Lists comments on an issue or PR with pagination.
   */
  async listComments(issueNumber: number): Promise<CommentInfo[]> {
    try {
      return await this.requestWithRetry(() =>
        this.octokit.paginate(
          this.octokit.rest.issues.listComments,
          {
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
            per_page: 100,
          },
        ),
      );
    } catch (err: unknown) {
      if (this.dryRun) {
        logger.warn(`[DRY-RUN] Could not fetch comments for #${issueNumber}: ${String(err)}`);
        return [];
      }
      throw err;
    }
  }

  /**
   * Creates a comment on an issue or PR.
   */
  async createComment(issueNumber: number, body: string): Promise<number | null> {
    if (this.dryRun) {
      logger.info(`[DRY-RUN] Would post comment on #${issueNumber} (${body.length} chars)`);
      stepSummary.addItem({
        type: 'comment',
        title: `Post comment on #${issueNumber}`,
        details: body.slice(0, 120) + (body.length > 120 ? '...' : ''),
        status: 'would-apply',
      });
      return null;
    }

    const response = await this.requestWithRetry(() =>
      this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body,
      }),
    );
    logger.info(`Created comment #${response.data.id} on issue #${issueNumber}`);
    stepSummary.addItem({
      type: 'comment',
      title: `Posted comment on #${issueNumber}`,
      details: body.slice(0, 120) + (body.length > 120 ? '...' : ''),
      status: 'applied',
    });
    return response.data.id;
  }

  /**
   * Updates an existing comment on an issue or PR.
   */
  async updateComment(commentId: number, body: string): Promise<void> {
    if (this.dryRun) {
      logger.info(`[DRY-RUN] Would update comment #${commentId} (${body.length} chars)`);
      stepSummary.addItem({
        type: 'comment',
        title: `Update comment #${commentId}`,
        details: body.slice(0, 120) + (body.length > 120 ? '...' : ''),
        status: 'would-apply',
      });
      return;
    }

    await this.requestWithRetry(() =>
      this.octokit.rest.issues.updateComment({
        owner: this.owner,
        repo: this.repo,
        comment_id: commentId,
        body,
      }),
    );
    logger.info(`Updated comment #${commentId}`);
    stepSummary.addItem({
      type: 'comment',
      title: `Updated comment #${commentId}`,
      details: body.slice(0, 120) + (body.length > 120 ? '...' : ''),
      status: 'applied',
    });
  }

  /**
   * Fetches changed files in a pull request with pagination.
   */
  async listPullRequestFiles(prNumber: number): Promise<PullRequestFileInfo[]> {
    try {
      const files = await this.requestWithRetry(() =>
        this.octokit.paginate(
          this.octokit.rest.pulls.listFiles,
          {
            owner: this.owner,
            repo: this.repo,
            pull_number: prNumber,
            per_page: 100,
          },
        ),
      );

      return files.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
      }));
    } catch (err: unknown) {
      if (this.dryRun) {
        logger.warn(`[DRY-RUN] Could not fetch PR files for #${prNumber}: ${String(err)}`);
        return [];
      }
      throw err;
    }
  }

  /**
   * List recent issues for duplicate checking (with optional closed issues within window).
   */
  async listIssues(options?: { state?: 'open' | 'closed' | 'all'; since?: string }) {
    try {
      return await this.requestWithRetry(() =>
        this.octokit.paginate(
          this.octokit.rest.issues.listForRepo,
          {
            owner: this.owner,
            repo: this.repo,
            state: options?.state || 'open',
            since: options?.since,
            per_page: 100,
          },
        ),
      );
    } catch (err: unknown) {
      if (this.dryRun) {
        logger.warn(`[DRY-RUN] Could not fetch issues for duplicate check: ${String(err)}`);
        return [];
      }
      throw err;
    }
  }

  /**
   * Creates a draft release.
   */
  async createDraftRelease(params: {
    tagName: string;
    name: string;
    body: string;
    targetCommitish?: string;
  }): Promise<{ id: number; html_url: string }> {
    // 1. Check existing releases to ensure idempotency
    let existingReleases: Array<{ id: number; tag_name: string; draft: boolean; html_url: string }> = [];
    if (this.octokit?.paginate && this.octokit?.rest?.repos?.listReleases) {
      try {
        const res = await this.octokit.paginate(
          this.octokit.rest.repos.listReleases,
          {
            owner: this.owner,
            repo: this.repo,
            per_page: 100,
          },
        );
        if (Array.isArray(res)) {
          existingReleases = res;
        }
      } catch (err: unknown) {
        logger.warn(`Could not list existing releases: ${String(err)}`);
      }
    }

    const existingMatch = (existingReleases || []).find((r) => r?.tag_name === params.tagName);

    if (existingMatch) {
      if (!existingMatch.draft) {
        logger.info(
          `Release ${params.tagName} is already published (id: ${existingMatch.id}). Skipping draft creation.`,
        );
        stepSummary.addItem({
          type: 'release',
          title: `Release ${params.tagName} already published`,
          details: `Skipped: tag ${params.tagName} is already published at ${existingMatch.html_url}`,
          status: 'skipped',
        });
        return { id: existingMatch.id, html_url: existingMatch.html_url };
      }

      // Existing release is a draft: update it instead of creating a duplicate
      if (this.dryRun) {
        logger.info(`[DRY-RUN] Would update existing draft release ${params.tagName} (id: ${existingMatch.id})`);
        stepSummary.addItem({
          type: 'release',
          title: `Update Draft Release ${params.tagName}`,
          details: `Existing draft #${existingMatch.id}`,
          status: 'would-apply',
        });
        return { id: existingMatch.id, html_url: existingMatch.html_url };
      }

      const response = await this.requestWithRetry(() =>
        this.octokit.rest.repos.updateRelease({
          owner: this.owner,
          repo: this.repo,
          release_id: existingMatch.id,
          tag_name: params.tagName,
          name: params.name,
          body: params.body,
          draft: true,
          target_commitish: params.targetCommitish,
        }),
      );

      logger.info(`Updated existing draft release ${params.tagName} (id: ${response.data.id})`);
      stepSummary.addItem({
        type: 'release',
        title: `Updated Draft Release ${params.tagName}`,
        details: response.data.html_url,
        status: 'applied',
      });
      return { id: response.data.id, html_url: response.data.html_url };
    }

    if (this.dryRun) {
      logger.info(`[DRY-RUN] Would create draft release ${params.tagName}: "${params.name}"`);
      stepSummary.addItem({
        type: 'release',
        title: `Create Draft Release ${params.tagName}`,
        details: params.name,
        status: 'would-apply',
      });
      return { id: 0, html_url: `https://github.com/${this.owner}/${this.repo}/releases/tag/${params.tagName}` };
    }

    const response = await this.requestWithRetry(() =>
      this.octokit.rest.repos.createRelease({
        owner: this.owner,
        repo: this.repo,
        tag_name: params.tagName,
        name: params.name,
        body: params.body,
        draft: true, // NEVER publish automatically
        prerelease: false,
        target_commitish: params.targetCommitish,
      }),
    );

    logger.info(`Created draft release ${params.tagName} (id: ${response.data.id})`);
    stepSummary.addItem({
      type: 'release',
      title: `Created Draft Release ${params.tagName}`,
      details: response.data.html_url,
      status: 'applied',
    });

    return { id: response.data.id, html_url: response.data.html_url };
  }
}
