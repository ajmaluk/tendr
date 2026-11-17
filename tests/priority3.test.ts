import { describe, it, expect, vi, beforeEach } from 'vitest';
import { determineLabelsToAdd } from '../src/triage/labeler';
import { analyzePullRequest } from '../src/pr/analyze';
import { postOrUpdateStickyComment, COMMENT_MARKERS } from '../src/github/comments';
import { GitHubClient } from '../src/github/client';
import { processRequiredInfo } from '../src/triage/required-info';
import { stepSummary } from '../src/util/summary';
import { run } from '../src/main';
import * as core from '@actions/core';

vi.mock('@actions/core');

describe('Priority 3: Behavior and quality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Priority 3.13: Auto-label only on opened, and stale state cleanup on edited', () => {
    it('cleans up needs-info label and updates comment when required sections are no longer required', async () => {
      let removedLabel = '';
      let updatedCommentBody = '';

      const mockOctokit = {
        rest: {
          issues: {
            removeLabel: vi.fn().mockImplementation((params) => {
              removedLabel = params.name;
              return Promise.resolve({ data: {} });
            }),
            updateComment: vi.fn().mockImplementation((params) => {
              updatedCommentBody = params.body;
              return Promise.resolve({ data: {} });
            }),
          },
        },
        paginate: vi.fn().mockResolvedValue([
          {
            id: 88,
            user: { login: 'tendr[bot]', type: 'Bot' },
            body: '<!-- tendr:triage-info -->\nMissing required info',
          },
        ]),
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const client = new GitHubClient({
        token: 'fake',
        repoContext: { owner: 'ajmaluk', repo: 'tendr' },
        octokit: mockOctokit,
      });

      // Issue now has label 'question', which does not require bug info
      const result = await processRequiredInfo({
        client,
        issueNumber: 15,
        body: 'just asking a question',
        labels: ['question', 'needs-info'],
        requiredInfoConfig: {
          bug: ['version', 'steps to reproduce'],
        },
        needsInfoLabel: 'needs-info',
      });

      expect(result.passed).toBe(true);
      expect(removedLabel).toBe('needs-info');
      expect(updatedCommentBody).toContain('Information Complete');
    });
  });

  describe('Priority 3.14: Keyword matching on word boundaries and bug defaults', () => {
    it('matches "app broken" as bug with extended default keywords', () => {
      const labels = determineLabelsToAdd(
        [
          {
            label: 'bug',
            keywords: ['crash', 'exception', 'traceback', "doesn't work", 'broken', 'not working', 'error', 'fails', 'failure', 'regression'],
            patterns: [],
          },
          {
            label: 'question',
            keywords: ['how do i', 'how to', 'is it possible'],
            patterns: [],
          },
        ],
        {
          title: 'app broken',
          body: 'the application crashes when opened',
        },
      );

      expect(labels).toContain('bug');
    });

    it('matches keywords strictly on word boundaries without substring false-positives', () => {
      const showLabels = determineLabelsToAdd(
        [
          {
            label: 'question',
            keywords: ['how'],
            patterns: [],
          },
        ],
        {
          title: 'show image',
          body: 'showing images in the gallery',
        },
      );
      expect(showLabels).not.toContain('question');

      const howLabels = determineLabelsToAdd(
        [
          {
            label: 'question',
            keywords: ['how'],
            patterns: [],
          },
        ],
        {
          title: 'how does this work?',
          body: 'please explain',
        },
      );
      expect(howLabels).toContain('question');
    });
  });

  describe('Priority 3.15: Linked issue check regex improvements', () => {
    it('recognizes Fixes: #12, Closes: #7 and fixes owner/repo#12', () => {
      const analysis1 = analyzePullRequest({
        files: [{ filename: 'src/index.ts', status: 'modified', additions: 10, deletions: 5, changes: 15 }],
        title: 'fix: resolve crash',
        body: 'Fixes: #12',
        config: {
          requireLinkedIssue: true,
          requireConventionalTitle: true,
          sizeThresholds: { xs: 10, s: 50, m: 250, l: 1000 },
          testGlobs: ['**/*.test.*'],
          docsGlobs: ['docs/**'],
          riskyGlobs: ['auth/**'],
        },
      });
      expect(analysis1.hasLinkedIssue).toBe(true);
      expect(analysis1.linkedIssueWarning).toBe(false);

      const analysis2 = analyzePullRequest({
        files: [{ filename: 'src/index.ts', status: 'modified', additions: 10, deletions: 5, changes: 15 }],
        title: 'fix: resolve bug',
        body: 'Closes: #7',
        config: {
          requireLinkedIssue: true,
          requireConventionalTitle: true,
          sizeThresholds: { xs: 10, s: 50, m: 250, l: 1000 },
          testGlobs: ['**/*.test.*'],
          docsGlobs: ['docs/**'],
          riskyGlobs: ['auth/**'],
        },
      });
      expect(analysis2.hasLinkedIssue).toBe(true);
      expect(analysis2.linkedIssueWarning).toBe(false);

      const analysis3 = analyzePullRequest({
        files: [{ filename: 'src/index.ts', status: 'modified', additions: 10, deletions: 5, changes: 15 }],
        title: 'fix: resolve issue',
        body: 'fixes ajmaluk/tendr#42',
        config: {
          requireLinkedIssue: true,
          requireConventionalTitle: true,
          sizeThresholds: { xs: 10, s: 50, m: 250, l: 1000 },
          testGlobs: ['**/*.test.*'],
          docsGlobs: ['docs/**'],
          riskyGlobs: ['auth/**'],
        },
      });
      expect(analysis3.hasLinkedIssue).toBe(true);
      expect(analysis3.linkedIssueWarning).toBe(false);
    });
  });

  describe('Priority 3.16: Rename Tendr comment markers backward-compatibility', () => {
    it('adopts and updates existing maintainerkit comment marker when posting with tendr marker', async () => {
      let updatedCommentId = 0;
      let updatedBody = '';

      const mockOctokit = {
        rest: {
          issues: {
            createComment: vi.fn(),
            updateComment: vi.fn().mockImplementation((params) => {
              updatedCommentId = params.comment_id;
              updatedBody = params.body;
              return Promise.resolve({ data: { id: params.comment_id } });
            }),
          },
        },
        paginate: vi.fn().mockResolvedValue([
          {
            id: 456,
            user: { login: 'github-actions[bot]', type: 'Bot' },
            body: '<!-- maintainerkit:triage-info -->\nOld triage info',
          },
        ]),
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const client = new GitHubClient({
        token: 'fake',
        repoContext: { owner: 'ajmaluk', repo: 'tendr' },
        octokit: mockOctokit,
      });

      await postOrUpdateStickyComment(client, 10, COMMENT_MARKERS.TRIAGE_INFO, 'New triage info');

      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
      expect(updatedCommentId).toBe(456);
      expect(updatedBody).toContain('<!-- tendr:triage-info -->');
      expect(updatedBody).toContain('New triage info');
    });
  });

  describe('Priority 3.17: Output accuracy and summary on failure', () => {
    it('sets labels-added to empty string on dry-run', async () => {
      process.env.GITHUB_EVENT_NAME = 'issues';
      process.env.GITHUB_EVENT_PATH = '/tmp/test-event.json';
      process.env.GITHUB_REPOSITORY = 'ajmaluk/tendr';
      process.env.INPUT_TOKEN = 'fake-token';
      process.env.INPUT_FEATURES = 'triage';
      process.env['INPUT_DRY-RUN'] = 'true';
      process.env['INPUT_CONFIG-PATH'] = '.github/tendr.yml';

      const fs = await import('fs');
      const github = await import('@actions/github');
      vi.spyOn(github, 'getOctokit').mockReturnValue({
        rest: {
          issues: {
            addLabels: vi.fn().mockResolvedValue({ data: [] }),
            removeLabel: vi.fn().mockResolvedValue({ data: {} }),
            createComment: vi.fn().mockResolvedValue({ data: { id: 777 } }),
            updateComment: vi.fn().mockResolvedValue({ data: {} }),
            listComments: vi.fn(),
          },
          repos: {
            getContent: vi.fn().mockRejectedValue({ status: 404 }),
          },
        },
        paginate: vi.fn().mockResolvedValue([]),
      } as any);

      fs.writeFileSync(
        '/tmp/test-event.json',
        JSON.stringify({
          action: 'opened',
          issue: {
            number: 1,
            title: 'crash on load',
            body: 'full error traceback and steps',
            labels: [],
          },
        }),
      );

      vi.mocked(core.getBooleanInput).mockReturnValue(true);
      vi.mocked(core.getInput).mockImplementation((name) => {
        if (name === 'github-token' || name === 'token') return 'fake-token';
        if (name === 'features') return 'triage';
        if (name === 'config-path') return '.github/tendr.yml';
        return '';
      });

      await run();

      expect(core.setOutput).toHaveBeenCalledWith('labels-added', '');
    });

    it('always writes summary in finally block even when execution fails', async () => {
      const summarySpy = vi.spyOn(stepSummary, 'write');
      process.env.GITHUB_EVENT_NAME = 'issues';
      process.env.GITHUB_EVENT_PATH = '/tmp/invalid-path-will-fail.json';
      process.env.GITHUB_REPOSITORY = 'ajmaluk/tendr';
      process.env.INPUT_TOKEN = 'fake-token';
      process.env.INPUT_FEATURES = 'triage';
      process.env['INPUT_DRY-RUN'] = 'false';

      vi.mocked(core.getBooleanInput).mockReturnValue(false);
      vi.mocked(core.getInput).mockReturnValue('fake-token');

      await run();

      expect(core.setFailed).toHaveBeenCalled();
      expect(summarySpy).toHaveBeenCalled();
    });
  });
});
