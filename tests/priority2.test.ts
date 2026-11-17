import { describe, it, expect, vi } from 'vitest';
import { GitHubClient } from '../src/github/client';
import { getLatestReleaseOrTag, collectMergedPRs } from '../src/release/collect';
import { generateReleaseNotes } from '../src/release/notes';
import { loadConfig } from '../src/config/load';
import { generatePRReportMarkdown } from '../src/pr/report';
import { findCommentByMarker, postOrUpdateStickyComment } from '../src/github/comments';

describe('Priority 2: Reliability and API behavior', () => {
  describe('Priority 2.6: Bots as New Contributors and exclude-bots', () => {
    it('excludes bot accounts from New Contributors', async () => {
      const mockOctokit = {
        rest: {
          pulls: {
            list: vi.fn().mockResolvedValue({
              data: [
                {
                  number: 101,
                  title: 'bump lodash',
                  merged_at: '2026-02-01T00:00:00Z',
                  user: { login: 'dependabot[bot]', type: 'Bot' },
                  labels: [],
                },
                {
                  number: 102,
                  title: 'feat: human feature',
                  merged_at: '2026-02-02T00:00:00Z',
                  user: { login: 'alice', type: 'User' },
                  labels: [],
                },
              ],
            }),
          },
          repos: {
            listCommits: vi.fn(),
          },
        },
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const client = new GitHubClient({
        token: 'fake',
        repoContext: { owner: 'ajmaluk', repo: 'tendr' },
        octokit: mockOctokit,
      });

      const result = await collectMergedPRs(client, null);
      const newContributorLogins = result.firstTimeContributors.map((c) => c.author);

      expect(newContributorLogins).not.toContain('dependabot[bot]');
      expect(newContributorLogins).toContain('alice');

      // Notes should not list bot under new contributors
      const notes = generateReleaseNotes({
        version: 'v1.1.0',
        previousVersion: 'v1.0.0',
        config: { categories: [{ title: 'Features', labels: [], types: ['feat'] }], excludeBots: false },
        classifiedPRs: [
          {
            category: 'Features',
            pr: {
              number: 102,
              title: 'feat: human feature',
              author: 'alice',
              mergedAt: '2026-02-02T00:00:00Z',
              labels: [],
              body: '',
            },
            conventionalType: 'feat',
            scope: null,
            isBreaking: false,
          },
        ],
        firstTimeContributors: result.firstTimeContributors,
      });

      expect(notes).not.toContain('@dependabot[bot]');
      expect(notes).toContain('@alice');
    });
  });

  describe('Priority 2.7: Latest-version detection with moving major tags', () => {
    it('ignores moving major tags like v1 and selects the highest semver tag', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getLatestRelease: vi.fn().mockRejectedValue({ status: 404 }),
            listTags: vi.fn().mockResolvedValue({
              data: [
                { name: 'v1', commit: { sha: 'sha1' } },
                { name: 'v1.0.0', commit: { sha: 'sha2' } },
                { name: 'v1.2.0', commit: { sha: 'sha3' } },
                { name: 'v1.1.0', commit: { sha: 'sha4' } },
              ],
            }),
            getCommit: vi.fn().mockResolvedValue({
              data: { commit: { author: { date: '2026-01-01T00:00:00Z' } } },
            }),
          },
        },
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const client = new GitHubClient({
        token: 'fake',
        repoContext: { owner: 'ajmaluk', repo: 'tendr' },
        octokit: mockOctokit,
      });

      const latest = await getLatestReleaseOrTag(client);
      expect(latest.tagName).toBe('v1.2.0');
    });

    it('returns null tag when only moving tag v1 exists', async () => {
      const mockOctokit = {
        rest: {
          repos: {
            getLatestRelease: vi.fn().mockRejectedValue({ status: 404 }),
            listTags: vi.fn().mockResolvedValue({
              data: [{ name: 'v1', commit: { sha: 'sha1' } }],
            }),
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
    });
  });

  describe('Priority 2.8: Merged-PR collection early pagination termination', () => {
    it('stops iterating closed PR pages once updated_at is older than since date', async () => {
      const listPullsSpy = vi.fn().mockImplementation(({ page }: { page?: number }) => {
        if (!page || page === 1) {
          return Promise.resolve({
            data: [
              {
                number: 10,
                title: 'Recent PR',
                merged_at: '2026-02-15T00:00:00Z',
                updated_at: '2026-02-15T01:00:00Z',
                user: { login: 'alice', type: 'User' },
              },
              {
                number: 9,
                title: 'Older than since PR',
                merged_at: '2025-12-01T00:00:00Z',
                updated_at: '2025-12-01T00:00:00Z', // older than sinceDate 2026-01-01
                user: { login: 'bob', type: 'User' },
              },
            ],
          });
        }
        return Promise.resolve({ data: [] });
      });

      const mockOctokit = {
        rest: {
          pulls: {
            list: listPullsSpy,
          },
          repos: {
            listCommits: vi.fn().mockResolvedValue({ data: [] }),
          },
        },
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const client = new GitHubClient({
        token: 'fake',
        repoContext: { owner: 'ajmaluk', repo: 'tendr' },
        octokit: mockOctokit,
      });

      const result = await collectMergedPRs(client, '2026-01-01T00:00:00Z');
      expect(result.prs.length).toBe(1);
      expect(result.prs[0].number).toBe(10);
      // Page 2 should never be requested because updated_at < since was reached
      expect(listPullsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Priority 2.9: Rate-limit retry vs permission error', () => {
    it('throws friendly descriptive error on 403 permission error without retrying', async () => {
      let callCount = 0;
      const mockOctokit = {
        rest: {
          repos: {
            getContent: vi.fn().mockImplementation(() => {
              callCount++;
              const err: any = new Error('Resource not accessible by integration');
              err.status = 403;
              err.response = { headers: {} };
              return Promise.reject(err);
            }),
          },
        },
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const client = new GitHubClient({
        token: 'fake',
        repoContext: { owner: 'ajmaluk', repo: 'tendr' },
        octokit: mockOctokit,
      });

      await expect(client.getFileContent('non-existent-unique-path.yml')).rejects.toThrow(
        /Resource not accessible by integration|permissions/,
      );
      // Permission error must NOT be retried
      expect(callCount).toBe(1);
    });
  });

  describe('Priority 2.10: Config load error handling', () => {
    it('fails run on 403 or 500 error instead of silently falling back to defaults', async () => {
      const mockFetcher = {
        getFileContent: vi.fn().mockImplementation(() => {
          const err: any = new Error('Permission denied');
          err.status = 403;
          return Promise.reject(err);
        }),
      };

      await expect(loadConfig(mockFetcher, '.github/tendr.yml')).rejects.toThrow(
        /Failed to load configuration file|Permission denied/,
      );
    });
  });

  describe('Priority 2.11: Comment length limits', () => {
    it('caps sensitive paths at 20 with ...and N more', () => {
      const manyFiles = Array.from({ length: 50 }, (_, i) => `src/auth/secret_${i}.ts`);
      const report = generatePRReportMarkdown({
        sizeResult: { category: 'M', totalLinesChanged: 100, additions: 50, deletions: 50 },
        riskyFiles: manyFiles,
        testFiles: ['tests/auth.test.ts'],
        docFiles: [],
        needsTestsWarning: false,
        needsDocsWarning: false,
        isConventionalTitleValid: true,
        conventionalTitle: { isValid: true, type: 'feat', scope: null, description: 'auth' },
        linkedIssueWarning: false,
      });

      expect(report).toContain('Sensitive Paths');
      expect(report).toContain('…and 30 more');
      expect(report.length).toBeLessThan(60000);
    });

    it('truncates comment body in postOrUpdateStickyComment if it exceeds 60,000 characters', async () => {
      let createdBody = '';
      const mockOctokit = {
        rest: {
          issues: {
            listComments: vi.fn().mockResolvedValue({ data: [] }),
            createComment: vi.fn().mockImplementation((params) => {
              createdBody = params.body;
              return Promise.resolve({ data: { id: 123 } });
            }),
          },
        },
        paginate: vi.fn().mockResolvedValue([]),
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const client = new GitHubClient({
        token: 'fake',
        repoContext: { owner: 'ajmaluk', repo: 'tendr' },
        octokit: mockOctokit,
      });

      const hugeContent = 'a'.repeat(70000);
      await postOrUpdateStickyComment(client, 1, '<!-- tendr:pr-report -->', hugeContent);

      expect(createdBody.length).toBeLessThanOrEqual(60000);
      expect(createdBody).toContain('[truncated]');
    });
  });

  describe('Priority 2.12: Concurrent comments and marker preference', () => {
    it('prefers Bot comment and updates oldest if multiple marker comments exist', async () => {
      const comments = [
        { id: 200, user: { login: 'user1', type: 'User' }, body: '<!-- tendr:triage-info -->\nUser copy' },
        { id: 100, user: { login: 'github-actions[bot]', type: 'Bot' }, body: '<!-- tendr:triage-info -->\nBot copy' },
      ];

      const mockOctokit = {
        rest: {
          issues: {
            listComments: vi.fn(),
          },
        },
        paginate: vi.fn().mockResolvedValue(comments),
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const client = new GitHubClient({
        token: 'fake',
        repoContext: { owner: 'ajmaluk', repo: 'tendr' },
        octokit: mockOctokit,
      });

      const found = await findCommentByMarker(client, 1, '<!-- tendr:triage-info -->');
      expect(found).not.toBeNull();
      // Should pick bot comment with id 100
      expect(found?.id).toBe(100);
    });
  });
});
