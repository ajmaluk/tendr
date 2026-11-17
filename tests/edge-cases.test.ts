import { describe, it, expect, vi } from 'vitest';
import { determineLabelsToAdd } from '../src/triage/labeler';
import { checkMissingRequiredSections } from '../src/triage/required-info';
import { tokenize } from '../src/text/tokenize';
import { analyzePullRequest } from '../src/pr/analyze';
import { PullRequestsConfig } from '../src/config/schema';
import { getLatestReleaseOrTag, collectMergedPRs } from '../src/release/collect';
import { GitHubClient } from '../src/github/client';

describe('Comprehensive Edge Cases & Security Hardening', () => {
  const prConfig: PullRequestsConfig = {
    sizeThresholds: { xs: 10, s: 50, m: 250, l: 1000 },
    testGlobs: ['**/*.test.*', 'tests/**'],
    docsGlobs: ['README.md', 'docs/**'],
    riskyGlobs: ['**/auth/**'],
    requireConventionalTitle: true,
    requireLinkedIssue: false,
  };

  it('handles empty bodies safely across all triage engines', () => {
    expect(
      determineLabelsToAdd(
        [{ label: 'bug', keywords: ['crash'] }],
        { title: '', body: '' },
      ),
    ).toEqual([]);

    expect(checkMissingRequiredSections('', ['version', 'steps'])).toEqual([
      'version',
      'steps',
    ]);

    expect(tokenize('')).toEqual([]);
  });

  it('handles massive 100k+ character payloads without crashing or freezing', () => {
    const hugeBody = 'abc '.repeat(25000); // 100,000 chars

    const start = Date.now();
    const tokens = tokenize(hugeBody);
    const missing = checkMissingRequiredSections(hugeBody, ['version']);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(1000);
    expect(tokens.length).toBeGreaterThan(0);
    expect(missing).toContain('version');
  });

  it('handles non-English text and unicode characters gracefully', () => {
    const unicodeText = 'Bug: 应用程序崩溃 ! 错误代码: 0x80004005. Bitte beheben Sie diesen Fehler.';
    const tokens = tokenize(unicodeText);
    expect(tokens.length).toBeGreaterThan(0);

    const labels = determineLabelsToAdd(
      [{ label: 'bug', keywords: ['应用程序崩溃'] }],
      { title: unicodeText },
    );
    expect(labels).toEqual(['bug']);
  });

  it('ignores stack traces and code blocks during tokenization and keyword search', () => {
    const issueWithCode = `
Title: Feature request

Here is my code sample:
\`\`\`ts
function crashApp() {
  throw new Error("fake exception");
}
\`\`\`

Please add this new feature.
`;

    const tokens = tokenize(issueWithCode);
    expect(tokens).not.toContain('crashapp');
    expect(tokens).toContain('feature');
    expect(tokens).toContain('request');
  });

  it('handles pull request pagination with 3,000+ changed files cleanly', () => {
    // Generate 3,500 fake files
    const largeFileList = Array.from({ length: 3500 }, (_, i) => ({
      filename: `src/generated/file_${i}.ts`,
      status: 'added',
      additions: 1,
      deletions: 0,
      changes: 1,
    }));

    const result = analyzePullRequest({
      files: largeFileList,
      title: 'feat: add large generated dataset',
      config: prConfig,
    });

    expect(result.totalFiles).toBe(3500);
    expect(result.totalChanges).toBe(3500);
    expect(result.sizeLabel).toBe('size/XL');
  });

  it('handles repository with zero releases or tags gracefully', async () => {
    const mockOctokit = {
      rest: {
        repos: {
          getLatestRelease: vi.fn().mockRejectedValue({ status: 404 }),
          listTags: vi.fn().mockResolvedValue({ data: [] }),
        },
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'fake',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      octokit: mockOctokit,
    });

    const latest = await getLatestReleaseOrTag(client);
    expect(latest.tagName).toBeNull();
    expect(latest.publishedAt).toBeNull();
  });

  it('handles bot authors and unknown users in PR collection', async () => {
    const mockOctokit = {
      rest: {
        pulls: {
          list: vi.fn(),
        },
      },
      paginate: vi.fn().mockResolvedValue([
        {
          number: 1,
          title: 'chore: dependabot bump',
          user: { login: 'dependabot[bot]' },
          merged_at: '2026-03-01T00:00:00Z',
          labels: [],
        },
        {
          number: 2,
          title: 'fix: patch',
          user: null, // edge case: user deleted or null
          merged_at: '2026-03-02T00:00:00Z',
          labels: [],
        },
      ]),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'fake',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      octokit: mockOctokit,
    });

    const { prs, firstTimeContributors } = await collectMergedPRs(client);
    expect(prs.length).toBe(2);
    expect(prs[0].author).toBe('unknown');
    expect(prs[1].author).toBe('dependabot[bot]');
    // 'unknown' is excluded from first time contributors
    expect(firstTimeContributors.some((c) => c.author === 'unknown')).toBe(false);
  });
});
