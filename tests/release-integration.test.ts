import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { run } from '../src/main';

describe('Release Drafting Integration (Phase 3)', () => {
  let mockOctokit: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    vi.clearAllMocks();

    mockOctokit = {
      rest: {
        repos: {
          getLatestRelease: vi.fn().mockResolvedValue({
            data: {
              tag_name: 'v1.0.0',
              published_at: '2026-01-01T00:00:00Z',
            },
          }),
          listTags: vi.fn().mockResolvedValue({ data: [] }),
          getContent: vi.fn().mockRejectedValue({ status: 404 }), // default config
          createRelease: vi.fn().mockResolvedValue({
            data: {
              id: 555,
              html_url: 'https://github.com/ajmaluk/tendr/releases/tag/v1.1.0',
            },
          }),
        },
        pulls: {
          list: vi.fn(),
        },
      },
      paginate: vi.fn().mockImplementation((fn) => {
        if (fn === mockOctokit.rest.pulls.list) {
          return Promise.resolve([
            {
              number: 77,
              title: 'feat: add duplicate issue detection',
              body: 'Resolves #22',
              user: { login: 'ajmaluk' },
              merged_at: '2026-01-05T12:00:00Z',
              labels: [{ name: 'enhancement' }],
            },
            {
              number: 60, // Before v1.0.0, should be excluded from this release
              title: 'fix: older bug',
              body: '',
              user: { login: 'old-dev' },
              merged_at: '2025-12-01T00:00:00Z',
              labels: [{ name: 'bug' }],
            },
          ]);
        }
        return Promise.resolve([]);
      }),
    };

    vi.spyOn(github, 'getOctokit').mockReturnValue(mockOctokit);
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'dry-run') return 'false';
      if (name === 'features') return 'release';
      if (name === 'config-path') return '.github/maintainerkit.yml';
      return '';
    });
    vi.spyOn(core, 'setOutput').mockImplementation(() => {});
    vi.spyOn(core, 'setFailed').mockImplementation(() => {});
  });

  it('collects merged PRs since last release, suggests semver bump, and creates draft release', async () => {
    Object.defineProperty(github, 'context', {
      value: {
        eventName: 'workflow_dispatch',
        payload: {},
        repo: { owner: 'ajmaluk', repo: 'tendr' },
      },
      writable: true,
    });

    await run();

    expect(core.setFailed).not.toHaveBeenCalled();

    // Suggested bump: v1.0.0 + feat -> v1.1.0
    expect(core.setOutput).toHaveBeenCalledWith('suggested-version', 'v1.1.0');

    // Release must be created with draft: true
    expect(mockOctokit.rest.repos.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        tag_name: 'v1.1.0',
        name: 'Release v1.1.0',
        draft: true,
        body: expect.stringContaining('### Features'),
      }),
    );
  });
});
