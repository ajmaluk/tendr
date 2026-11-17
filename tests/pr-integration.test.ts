import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { run } from '../src/main';
import prFixture from './fixtures/pull-request-opened.json';

describe('PR Analysis Integration (Phase 2)', () => {
  let mockOctokit: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    vi.clearAllMocks();

    mockOctokit = {
      rest: {
        issues: {
          addLabels: vi.fn().mockResolvedValue({ data: [] }),
          removeLabel: vi.fn().mockResolvedValue({ data: {} }),
          createComment: vi.fn().mockResolvedValue({ data: { id: 901 } }),
          updateComment: vi.fn().mockResolvedValue({ data: {} }),
          listComments: vi.fn(),
        },
        pulls: {
          listFiles: vi.fn(),
        },
        repos: {
          getContent: vi.fn().mockRejectedValue({ status: 404 }), // default config
        },
      },
      paginate: vi.fn().mockImplementation((fn) => {
        if (fn === mockOctokit.rest.pulls.listFiles) {
          return Promise.resolve([
            {
              filename: 'src/auth/service.ts',
              status: 'added',
              additions: 120,
              deletions: 10,
              changes: 130,
            },
            {
              filename: 'package-lock.json',
              status: 'modified',
              additions: 2,
              deletions: 2,
              changes: 4,
            },
          ]);
        }
        if (fn === mockOctokit.rest.issues.listComments) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      }),
    };

    vi.spyOn(github, 'getOctokit').mockReturnValue(mockOctokit);
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'dry-run') return 'false';
      if (name === 'features') return 'pull-requests';
      if (name === 'config-path') return '.github/maintainerkit.yml';
      return '';
    });
    vi.spyOn(core, 'setOutput').mockImplementation(() => {});
    vi.spyOn(core, 'setFailed').mockImplementation(() => {});
  });

  it('analyzes PR: posts sticky comment with risky paths and assigns size and area labels', async () => {
    Object.defineProperty(github, 'context', {
      value: {
        eventName: 'pull_request',
        payload: prFixture,
        repo: { owner: 'ajmaluk', repo: 'tendr' },
      },
      writable: true,
    });

    await run();

    expect(core.setFailed).not.toHaveBeenCalled();

    // Check sticky comment creation
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 105,
        body: expect.stringContaining('### 📊 Pull Request Analysis'),
      }),
    );

    // Check size/M label added (134 lines changed falls in 51-250 -> size/M)
    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 105,
        labels: ['size/M'],
      }),
    );

    // Check area label added (area/src)
    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 105,
        labels: expect.arrayContaining(['area/src']),
      }),
    );
  });
});
