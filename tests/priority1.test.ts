import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { run } from '../src/main';
import { GitHubClient } from '../src/github/client';
import {
  checkMissingRequiredSections,
  extractSections,
} from '../src/triage/required-info';
import { detectDuplicateIssues } from '../src/triage/duplicates';

describe('Priority 1.1: Release drafting event gating', () => {
  let mockOctokit: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    vi.clearAllMocks();
    mockOctokit = {
      rest: {
        issues: {
          addLabels: vi.fn().mockResolvedValue({ data: [] }),
          removeLabel: vi.fn().mockResolvedValue({ data: {} }),
          createComment: vi.fn().mockResolvedValue({ data: { id: 1 } }),
          updateComment: vi.fn().mockResolvedValue({ data: {} }),
          listComments: vi.fn(),
        },
        repos: {
          getContent: vi.fn().mockRejectedValue({ status: 404 }),
          getLatestRelease: vi.fn().mockResolvedValue({ data: { tag_name: 'v1.0.0' } }),
          listTags: vi.fn().mockResolvedValue({ data: [] }),
          listReleases: vi.fn().mockResolvedValue({ data: [] }),
          createRelease: vi.fn().mockResolvedValue({ data: { id: 99, html_url: 'url' } }),
        },
        pulls: {
          list: vi.fn(),
        },
      },
      paginate: vi.fn().mockResolvedValue([]),
    };

    vi.spyOn(github, 'getOctokit').mockReturnValue(mockOctokit);
    vi.spyOn(core, 'setOutput').mockImplementation(() => {});
    vi.spyOn(core, 'setFailed').mockImplementation(() => {});
  });

  it('does NOT run release drafting on issues event even when release feature is enabled', async () => {
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'features') return 'triage,pull-requests,release';
      if (name === 'dry-run') return 'false';
      return '';
    });

    Object.defineProperty(github, 'context', {
      value: {
        eventName: 'issues',
        payload: {
          action: 'opened',
          issue: { number: 1, title: 'Bug report', body: 'Steps' },
        },
        repo: { owner: 'ajmaluk', repo: 'tendr' },
      },
      writable: true,
    });

    await run();

    // Release creation should NEVER be called on an issues event
    expect(mockOctokit.rest.repos.createRelease).not.toHaveBeenCalled();
    expect(mockOctokit.rest.repos.getLatestRelease).not.toHaveBeenCalled();
  });

  it('runs release drafting on workflow_dispatch event when release is enabled', async () => {
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'features') return 'release';
      if (name === 'dry-run') return 'false';
      return '';
    });

    Object.defineProperty(github, 'context', {
      value: {
        eventName: 'workflow_dispatch',
        payload: {},
        repo: { owner: 'ajmaluk', repo: 'tendr' },
      },
      writable: true,
    });

    await run();

    expect(mockOctokit.rest.repos.createRelease).toHaveBeenCalled();
  });
});

describe('Priority 1.2: Release drafting idempotency', () => {
  it('updates existing draft release instead of creating a duplicate', async () => {
    const existingDraft = {
      id: 123,
      tag_name: 'v1.1.0',
      draft: true,
      html_url: 'https://github.com/ajmaluk/tendr/releases/123',
    };

    const mockOctokit = {
      rest: {
        repos: {
          listReleases: vi.fn(),
          createRelease: vi.fn(),
          updateRelease: vi.fn().mockResolvedValue({
            data: { id: 123, html_url: 'https://github.com/ajmaluk/tendr/releases/123' },
          }),
        },
      },
      paginate: vi.fn().mockResolvedValue([existingDraft]),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'fake',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      octokit: mockOctokit,
      dryRun: false,
    });

    const result = await client.createDraftRelease({
      tagName: 'v1.1.0',
      name: 'Release v1.1.0',
      body: 'Updated release notes',
    });

    expect(mockOctokit.rest.repos.createRelease).not.toHaveBeenCalled();
    expect(mockOctokit.rest.repos.updateRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        release_id: 123,
        tag_name: 'v1.1.0',
        name: 'Release v1.1.0',
        draft: true,
      }),
    );
    expect(result.id).toBe(123);
  });

  it('skips creation if a published (non-draft) release with that tag already exists', async () => {
    const publishedRelease = {
      id: 456,
      tag_name: 'v1.1.0',
      draft: false,
      html_url: 'https://github.com/ajmaluk/tendr/releases/456',
    };

    const mockOctokit = {
      rest: {
        repos: {
          listReleases: vi.fn(),
          createRelease: vi.fn(),
          updateRelease: vi.fn(),
        },
      },
      paginate: vi.fn().mockResolvedValue([publishedRelease]),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'fake',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      octokit: mockOctokit,
      dryRun: false,
    });

    const result = await client.createDraftRelease({
      tagName: 'v1.1.0',
      name: 'Release v1.1.0',
      body: 'Notes',
    });

    expect(mockOctokit.rest.repos.createRelease).not.toHaveBeenCalled();
    expect(mockOctokit.rest.repos.updateRelease).not.toHaveBeenCalled();
    expect(result.id).toBe(456);
  });
});

describe('Priority 1.3: Safe dry-run input parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DRY_RUN;
    delete process.env.INPUT_DRY_RUN;
  });

  it('fails with exact error message when dry-run is invalid (e.g. "yes")', async () => {
    const setFailedSpy = vi.spyOn(core, 'setFailed');

    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'dry-run') return 'yes';
      return '';
    });

    Object.defineProperty(github, 'context', {
      value: {
        eventName: 'issues',
        payload: { action: 'opened', issue: { number: 1, title: 'Test' } },
        repo: { owner: 'ajmaluk', repo: 'tendr' },
      },
      writable: true,
    });

    await run();

    expect(setFailedSpy).toHaveBeenCalledWith(
      'Invalid value for "dry-run": expected true or false (got "yes").',
    );
  });
});

describe('Priority 1.4: Required-info section parser robustness', () => {
  const required = ['version', 'steps to reproduce', 'expected', 'actual'];

  it('does not treat reproduction URLs as section headers', () => {
    const body = `
### Steps to reproduce
https://github.com/ajmaluk/tendr/issues/1

### Expected
Works

### Actual
Fails

### Version
1.0.0
`;
    const missing = checkMissingRequiredSections(body, required);
    expect(missing).toEqual([]);
  });

  it('does not treat "Error: boom" as a section header', () => {
    const body = `
### Steps to reproduce
1. Run command
Error: connection failed with code 500

### Expected
Success

### Actual
Error

### Version
1.0.0
`;
    const missing = checkMissingRequiredSections(body, required);
    expect(missing).toEqual([]);
  });

  it('ignores label-style headers inside fenced code blocks', () => {
    const body = `
### Steps to reproduce
Run the following:
\`\`\`
Version: 9.9.9
Expected: something in code
\`\`\`
Then crash occurs.

### Expected
No crash

### Actual
Crash

### Version
1.0.0
`;
    const sections = extractSections(body, required);
    // The code fence "Version: 9.9.9" must not overwrite the real Version section
    expect(sections.get('version')).toBe('1.0.0');
    const missing = checkMissingRequiredSections(body, required);
    expect(missing).toEqual([]);
  });

  it('does not satisfy "version" with empty or non-alphanumeric emoji header "### 🐛"', () => {
    const body = `
### 🐛
Some bug description

### Steps to reproduce
1. Repro

### Expected
Exp

### Actual
Act
`;
    const missing = checkMissingRequiredSections(body, required);
    // 'version' must still be missing!
    expect(missing).toContain('version');
  });

  it('still reports placeholder values as missing in issue forms', () => {
    const body = `
### Version
_No response_

### Steps to reproduce
N/A

### Expected
Work

### Actual
Broken
`;
    const missing = checkMissingRequiredSections(body, required);
    expect(missing).toContain('version');
    expect(missing).toContain('steps to reproduce');
  });
});

describe('Priority 1.5: Duplicate detection window and bounds', () => {
  it('queries open issues and closed issues within window separately, and handles 0 days', async () => {
    const listIssuesSpy = vi.fn().mockImplementation((opts) => {
      if (opts.state === 'open') {
        return Promise.resolve([
          { number: 10, title: 'Old open issue about crash', state: 'open' },
        ]);
      }
      if (opts.state === 'closed') {
        return Promise.resolve([
          { number: 20, title: 'Closed issue about crash', state: 'closed' },
        ]);
      }
      return Promise.resolve([]);
    });

    const mockOctokit = {
      rest: {
        issues: {
          createComment: vi.fn().mockResolvedValue({ data: { id: 1 } }),
          updateComment: vi.fn(),
          addLabels: vi.fn().mockResolvedValue({ data: [] }),
        },
      },
      paginate: vi.fn().mockResolvedValue([]),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'fake',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      octokit: mockOctokit,
      dryRun: false,
    });
    client.listIssues = listIssuesSpy;

    // Test with includeClosedDays = 0 (open issues only)
    await detectDuplicateIssues({
      client,
      currentIssueNumber: 99,
      title: 'Crash issue',
      threshold: 0.5,
      maxSuggestions: 3,
      includeClosedDays: 0,
    });

    // When includeClosedDays is 0, closed issues query should NOT be made
    expect(listIssuesSpy).toHaveBeenCalledWith(expect.objectContaining({ state: 'open' }));
    expect(listIssuesSpy).not.toHaveBeenCalledWith(expect.objectContaining({ state: 'closed' }));
  });
});
