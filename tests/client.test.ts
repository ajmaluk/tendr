import { describe, it, expect, vi } from 'vitest';
import { GitHubClient, sanitizeUserText } from '../src/github/client';
import { COMMENT_MARKERS, postOrUpdateStickyComment, findCommentByMarker } from '../src/github/comments';

describe('GitHubClient & Dry Run Guarantees', () => {
  it('sanitizes user text preventing @mention pings', () => {
    const text = 'Fixes reported by @john_doe and @team-lead!';
    const sanitized = sanitizeUserText(text);
    expect(sanitized).toBe('Fixes reported by @\u200Bjohn_doe and @\u200Bteam-lead!');
    expect(sanitized).not.toContain('@john_doe');
  });

  it('guarantees ZERO write calls when dry-run is true', async () => {
    const mockOctokit = {
      rest: {
        issues: {
          addLabels: vi.fn(),
          removeLabel: vi.fn(),
          createComment: vi.fn(),
          updateComment: vi.fn(),
          listComments: vi.fn(),
        },
        repos: {
          getContent: vi.fn(),
          createRelease: vi.fn(),
        },
      },
      paginate: vi.fn(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'fake-token',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      dryRun: true,
      octokit: mockOctokit,
    });

    // Attempt all write actions
    await client.addLabels(10, ['bug', 'help-wanted']);
    await client.removeLabel(10, 'needs-info');
    await client.createComment(10, 'Test comment');
    await client.updateComment(999, 'Updated comment');
    await client.createDraftRelease({
      tagName: 'v1.0.0',
      name: 'Release v1.0.0',
      body: 'Release notes',
    });

    // Assert that zero write API calls were made to GitHub
    expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled();
    expect(mockOctokit.rest.issues.removeLabel).not.toHaveBeenCalled();
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    expect(mockOctokit.rest.issues.updateComment).not.toHaveBeenCalled();
    expect(mockOctokit.rest.repos.createRelease).not.toHaveBeenCalled();
  });

  it('calls write APIs when dry-run is false', async () => {
    const mockOctokit = {
      rest: {
        issues: {
          addLabels: vi.fn().mockResolvedValue({ data: [] }),
          removeLabel: vi.fn().mockResolvedValue({ data: {} }),
          createComment: vi.fn().mockResolvedValue({ data: { id: 123 } }),
          updateComment: vi.fn().mockResolvedValue({ data: {} }),
        },
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'fake-token',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      dryRun: false,
      octokit: mockOctokit,
    });

    await client.addLabels(10, ['bug']);
    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledTimes(1);

    await client.removeLabel(10, 'needs-info');
    expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalledTimes(1);

    const commentId = await client.createComment(10, 'Hello');
    expect(commentId).toBe(123);
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledTimes(1);
  });
});

describe('Sticky Comments & Idempotency', () => {
  it('creates comment when none exists with the marker', async () => {
    const commentsList: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const mockOctokit = {
      rest: {
        issues: {
          listComments: vi.fn(),
          createComment: vi.fn().mockImplementation(({ body }) => {
            const comment = { id: 101, body, created_at: '', updated_at: '' };
            commentsList.push(comment);
            return Promise.resolve({ data: comment });
          }),
          updateComment: vi.fn(),
        },
      },
      paginate: vi.fn().mockImplementation(() => Promise.resolve(commentsList)),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'token',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      dryRun: false,
      octokit: mockOctokit,
    });

    await postOrUpdateStickyComment(
      client,
      1,
      COMMENT_MARKERS.TRIAGE_INFO,
      'Please provide repro steps.',
    );

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledTimes(1);
    expect(mockOctokit.rest.issues.updateComment).not.toHaveBeenCalled();
    expect(commentsList[0].body).toContain(COMMENT_MARKERS.TRIAGE_INFO);
  });

  it('updates existing comment instead of creating a second one (idempotent)', async () => {
    const existingComment = {
      id: 202,
      body: `${COMMENT_MARKERS.TRIAGE_INFO}\nInitial warning`,
      created_at: '',
      updated_at: '',
    };

    const mockOctokit = {
      rest: {
        issues: {
          createComment: vi.fn(),
          updateComment: vi.fn().mockResolvedValue({}),
        },
      },
      paginate: vi.fn().mockResolvedValue([existingComment]),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const client = new GitHubClient({
      token: 'token',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      dryRun: false,
      octokit: mockOctokit,
    });

    await postOrUpdateStickyComment(
      client,
      1,
      COMMENT_MARKERS.TRIAGE_INFO,
      'Updated warning content',
    );

    // Should NOT create duplicate comment
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    // Should update existing comment
    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        comment_id: 202,
        body: expect.stringContaining('Updated warning content'),
      }),
    );
  });

  it('findCommentByMarker correctly locates marker', async () => {
    const comments = [
      { id: 1, body: 'Just a normal comment' },
      { id: 2, body: `<!-- maintainerkit:pr-report -->\nPR report details` },
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
      token: 'token',
      repoContext: { owner: 'ajmaluk', repo: 'tendr' },
      octokit: mockOctokit,
    });

    const found = await findCommentByMarker(client, 5, COMMENT_MARKERS.PR_REPORT);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(2);

    const notFound = await findCommentByMarker(client, 5, COMMENT_MARKERS.TRIAGE_INFO);
    expect(notFound).toBeNull();
  });
});
