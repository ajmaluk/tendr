import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { run } from '../src/main';
import bugFixture from './fixtures/issues-opened-bug.json';
import missingInfoFixture from './fixtures/issues-opened-missing-info.json';

describe('MaintainerKit Main Orchestrator (Phase 1 Integration)', () => {
  let mockOctokit: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    vi.clearAllMocks();

    mockOctokit = {
      rest: {
        issues: {
          addLabels: vi.fn().mockResolvedValue({ data: [] }),
          removeLabel: vi.fn().mockResolvedValue({ data: {} }),
          createComment: vi.fn().mockResolvedValue({ data: { id: 777 } }),
          updateComment: vi.fn().mockResolvedValue({ data: {} }),
          listComments: vi.fn(),
        },
        repos: {
          getContent: vi.fn().mockRejectedValue({ status: 404 }), // default config
        },
      },
      paginate: vi.fn().mockResolvedValue([]),
    };

    vi.spyOn(github, 'getOctokit').mockReturnValue(mockOctokit);
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'dry-run') return 'false';
      if (name === 'features') return 'triage';
      if (name === 'config-path') return '.github/maintainerkit.yml';
      return '';
    });
    vi.spyOn(core, 'setOutput').mockImplementation(() => {});
    vi.spyOn(core, 'setFailed').mockImplementation(() => {});
  });

  it('runs triage on bug issue: labels bug and verifies info complete', async () => {
    // Set context to bug issue opened
    Object.defineProperty(github, 'context', {
      value: {
        eventName: 'issues',
        payload: bugFixture,
        repo: { owner: 'ajmaluk', repo: 'tendr' },
      },
      writable: true,
    });

    await run();

    expect(core.setFailed).not.toHaveBeenCalled();
    // Verify auto-labeling added 'bug'
    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 42,
        labels: ['bug'],
      }),
    );
  });

  it('runs triage on missing info issue: adds needs-info label and posts comment', async () => {
    Object.defineProperty(github, 'context', {
      value: {
        eventName: 'issues',
        payload: missingInfoFixture,
        repo: { owner: 'ajmaluk', repo: 'tendr' },
      },
      writable: true,
    });

    await run();

    expect(core.setFailed).not.toHaveBeenCalled();
    // Missing info comment was created
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 43,
        body: expect.stringContaining('### ⚠️ Missing Required Information'),
      }),
    );
    // needs-info label was applied
    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 43,
        labels: ['needs-info'],
      }),
    );
  });
});
