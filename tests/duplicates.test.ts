import { describe, it, expect, vi } from 'vitest';
import { detectDuplicateIssues } from '../src/triage/duplicates';
import { GitHubClient } from '../src/github/client';

describe('Duplicate Issue Detection', () => {
  it('identifies duplicate issues, posts comment, and adds possible-duplicate label', async () => {
    const mockIssues = [
      {
        number: 10,
        title: 'Crash on clicking save profile button',
        body: 'When I click save profile button, the browser crashes.',
        state: 'open',
      },
      {
        number: 20,
        title: 'Add support for dark mode theme',
        body: 'Please add dark mode.',
        state: 'open',
      },
      {
        number: 30, // Pull request, must be ignored
        title: 'Crash on clicking save profile button',
        body: 'Fix for crash',
        pull_request: {},
      },
    ];

    const mockOctokit = {
      rest: {
        issues: {
          createComment: vi.fn().mockResolvedValue({ data: { id: 888 } }),
          updateComment: vi.fn(),
          addLabels: vi.fn().mockResolvedValue({ data: [] }),
        },
      },
      paginate: vi.fn().mockResolvedValue(mockIssues),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'fake',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      octokit: mockOctokit,
      dryRun: false,
    });

    const matches = await detectDuplicateIssues({
      client,
      currentIssueNumber: 99,
      title: 'Crash when clicking save profile button',
      body: 'Clicking save profile button crashes app.',
      threshold: 0.5,
      maxSuggestions: 3,
      includeClosedDays: 180,
    });

    expect(matches.length).toBe(1);
    expect(matches[0].number).toBe(10);
    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 99,
        labels: ['possible-duplicate'],
      }),
    );
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 99,
        body: expect.stringContaining('#10'),
      }),
    );
  });
});
