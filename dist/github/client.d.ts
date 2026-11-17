import * as github from '@actions/github';
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
export declare function sanitizeUserText(text: string): string;
/**
 * GitHub API Client with dry-run protection, retry handling for rate limits,
 * and least-privilege operations.
 */
export declare class GitHubClient {
    readonly octokit: OctokitInstance;
    readonly owner: string;
    readonly repo: string;
    readonly dryRun: boolean;
    constructor(options: GitHubClientOptions);
    /**
     * Safe API call wrapper with retries on rate limits (429 or rate-limited 403s).
     * Non-rate-limit 403s (e.g. permission errors) fail immediately with clear instructions.
     */
    private requestWithRetry;
    /**
     * Fetches content of a file from repository. Returns null if file does not exist (404).
     */
    getFileContent(filePath: string): Promise<string | null>;
    /**
     * Adds labels to an issue or pull request.
     */
    addLabels(issueNumber: number, labels: string[]): Promise<string[]>;
    /**
     * Removes a label from an issue or pull request.
     */
    removeLabel(issueNumber: number, label: string): Promise<boolean>;
    /**
     * Lists comments on an issue or PR with pagination.
     */
    listComments(issueNumber: number): Promise<CommentInfo[]>;
    /**
     * Creates a comment on an issue or PR.
     */
    createComment(issueNumber: number, body: string): Promise<number | null>;
    /**
     * Updates an existing comment on an issue or PR.
     */
    updateComment(commentId: number, body: string): Promise<void>;
    /**
     * Fetches changed files in a pull request with pagination.
     */
    listPullRequestFiles(prNumber: number): Promise<PullRequestFileInfo[]>;
    /**
     * List recent issues for duplicate checking (with optional closed issues within window).
     */
    listIssues(options?: {
        state?: 'open' | 'closed' | 'all';
        since?: string;
    }): Promise<{
        id: number;
        node_id: string;
        url: string;
        repository_url: string;
        labels_url: string;
        comments_url: string;
        events_url: string;
        html_url: string;
        number: number;
        state: string;
        state_reason?: "completed" | "reopened" | "not_planned" | null;
        title: string;
        body?: string | null;
        user: {
            name?: string | null;
            email?: string | null;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string;
        } | null;
        labels: (string | {
            id?: number;
            node_id?: string;
            url?: string;
            name?: string;
            description?: string | null;
            color?: string | null;
            default?: boolean;
        })[];
        assignee: {
            name?: string | null;
            email?: string | null;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string;
        } | null;
        assignees?: {
            name?: string | null;
            email?: string | null;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string;
        }[] | null;
        milestone: {
            url: string;
            html_url: string;
            labels_url: string;
            id: number;
            node_id: string;
            number: number;
            state: "open" | "closed";
            title: string;
            description: string | null;
            creator: {
                name?: string | null;
                email?: string | null;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string | null;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string;
            } | null;
            open_issues: number;
            closed_issues: number;
            created_at: string;
            updated_at: string;
            closed_at: string | null;
            due_on: string | null;
        } | null;
        locked: boolean;
        active_lock_reason?: string | null;
        comments: number;
        pull_request?: {
            merged_at?: string | null;
            diff_url: string | null;
            html_url: string | null;
            patch_url: string | null;
            url: string | null;
        };
        closed_at: string | null;
        created_at: string;
        updated_at: string;
        draft?: boolean;
        closed_by?: {
            name?: string | null;
            email?: string | null;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string;
        } | null;
        body_html?: string;
        body_text?: string;
        timeline_url?: string;
        repository?: {
            id: number;
            node_id: string;
            name: string;
            full_name: string;
            license: {
                key: string;
                name: string;
                url: string | null;
                spdx_id: string | null;
                node_id: string;
                html_url?: string;
            } | null;
            forks: number;
            permissions?: {
                admin: boolean;
                pull: boolean;
                triage?: boolean;
                push: boolean;
                maintain?: boolean;
            };
            owner: {
                name?: string | null;
                email?: string | null;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string | null;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string;
            };
            private: boolean;
            html_url: string;
            description: string | null;
            fork: boolean;
            url: string;
            archive_url: string;
            assignees_url: string;
            blobs_url: string;
            branches_url: string;
            collaborators_url: string;
            comments_url: string;
            commits_url: string;
            compare_url: string;
            contents_url: string;
            contributors_url: string;
            deployments_url: string;
            downloads_url: string;
            events_url: string;
            forks_url: string;
            git_commits_url: string;
            git_refs_url: string;
            git_tags_url: string;
            git_url: string;
            issue_comment_url: string;
            issue_events_url: string;
            issues_url: string;
            keys_url: string;
            labels_url: string;
            languages_url: string;
            merges_url: string;
            milestones_url: string;
            notifications_url: string;
            pulls_url: string;
            releases_url: string;
            ssh_url: string;
            stargazers_url: string;
            statuses_url: string;
            subscribers_url: string;
            subscription_url: string;
            tags_url: string;
            teams_url: string;
            trees_url: string;
            clone_url: string;
            mirror_url: string | null;
            hooks_url: string;
            svn_url: string;
            homepage: string | null;
            language: string | null;
            forks_count: number;
            stargazers_count: number;
            watchers_count: number;
            size: number;
            default_branch: string;
            open_issues_count: number;
            is_template?: boolean;
            topics?: string[];
            has_issues: boolean;
            has_projects: boolean;
            has_wiki: boolean;
            has_pages: boolean;
            has_downloads: boolean;
            has_discussions?: boolean;
            archived: boolean;
            disabled: boolean;
            visibility?: string;
            pushed_at: string | null;
            created_at: string | null;
            updated_at: string | null;
            allow_rebase_merge?: boolean;
            temp_clone_token?: string;
            allow_squash_merge?: boolean;
            allow_auto_merge?: boolean;
            delete_branch_on_merge?: boolean;
            allow_update_branch?: boolean;
            use_squash_pr_title_as_default?: boolean;
            squash_merge_commit_title?: "PR_TITLE" | "COMMIT_OR_PR_TITLE";
            squash_merge_commit_message?: "PR_BODY" | "COMMIT_MESSAGES" | "BLANK";
            merge_commit_title?: "PR_TITLE" | "MERGE_MESSAGE";
            merge_commit_message?: "PR_BODY" | "PR_TITLE" | "BLANK";
            allow_merge_commit?: boolean;
            allow_forking?: boolean;
            web_commit_signoff_required?: boolean;
            open_issues: number;
            watchers: number;
            master_branch?: string;
            starred_at?: string;
            anonymous_access_enabled?: boolean;
        };
        performed_via_github_app?: {
            id: number;
            slug?: string;
            node_id: string;
            owner: {
                name?: string | null;
                email?: string | null;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string | null;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string;
            } | null;
            name: string;
            description: string | null;
            external_url: string;
            html_url: string;
            created_at: string;
            updated_at: string;
            permissions: {
                issues?: string;
                checks?: string;
                metadata?: string;
                contents?: string;
                deployments?: string;
                [key: string]: string | undefined;
            };
            events: string[];
            installations_count?: number;
            client_id?: string;
            client_secret?: string;
            webhook_secret?: string | null;
            pem?: string;
        } | null;
        author_association: "FIRST_TIME_CONTRIBUTOR" | "FIRST_TIMER" | "COLLABORATOR" | "CONTRIBUTOR" | "MANNEQUIN" | "MEMBER" | "NONE" | "OWNER";
        reactions?: {
            url: string;
            total_count: number;
            "+1": number;
            "-1": number;
            laugh: number;
            confused: number;
            heart: number;
            hooray: number;
            eyes: number;
            rocket: number;
        };
    }[]>;
    /**
     * Creates a draft release.
     */
    createDraftRelease(params: {
        tagName: string;
        name: string;
        body: string;
        targetCommitish?: string;
    }): Promise<{
        id: number;
        html_url: string;
    }>;
}
