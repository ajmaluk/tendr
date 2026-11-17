import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClient } from './github/client';
import { loadConfig } from './config/load';
import { determineLabelsToAdd } from './triage/labeler';
import { processRequiredInfo } from './triage/required-info';
import { detectDuplicateIssues } from './triage/duplicates';
import { analyzePullRequest } from './pr/analyze';
import { generatePRReportMarkdown } from './pr/report';
import { determineOutdatedSizeLabels } from './pr/size';
import { getLatestReleaseOrTag, collectMergedPRs } from './release/collect';
import { classifyPullRequests } from './release/classify';
import { generateReleaseNotes } from './release/notes';
import { determineBumpType, bumpVersion } from './release/semver';
import { COMMENT_MARKERS, postOrUpdateStickyComment } from './github/comments';
import { logger } from './util/logger';
import { stepSummary } from './util/summary';

export async function run(): Promise<void> {
  try {
    const token =
      core.getInput('github-token') ||
      process.env.INPUT_GITHUB_TOKEN ||
      process.env.GITHUB_TOKEN ||
      '';
    if (!token) {
      throw new Error('No GitHub token provided. Ensure "github-token" input is set.');
    }
    core.setSecret(token);

    let dryRun = false;
    const rawDryRun = (
      core.getInput('dry-run') ||
      process.env.INPUT_DRY_RUN ||
      process.env.DRY_RUN ||
      ''
    ).trim();

    if (rawDryRun !== '') {
      const lower = rawDryRun.toLowerCase();
      if (lower === 'true') {
        dryRun = true;
      } else if (lower === 'false') {
        dryRun = false;
      } else {
        const errorMsg = `Invalid value for "dry-run": expected true or false (got "${rawDryRun}").`;
        logger.error(errorMsg);
        core.setFailed(errorMsg);
        return;
      }
    }

    const configPath =
      core.getInput('config-path') ||
      process.env.INPUT_CONFIG_PATH ||
      process.env.CONFIG_PATH ||
      '.github/tendr.yml';

    const featuresInput =
      core.getInput('features') ||
      process.env.INPUT_FEATURES ||
      process.env.FEATURES ||
      'triage,pull-requests';

    const releaseTagInput =
      core.getInput('release-tag') ||
      process.env.INPUT_RELEASE_TAG ||
      process.env.RELEASE_TAG ||
      '';
    const enabledFeatures = featuresInput
      .split(',')
      .map((f) => f.trim().toLowerCase())
      .filter(Boolean);

    logger.info(`Tendr initialized (dryRun: ${dryRun}, features: ${enabledFeatures.join(', ')})`);
    stepSummary.setDryRun(dryRun);

    const client = new GitHubClient({
      token,
      dryRun,
    });

    const config = await loadConfig(client, configPath);
    const eventName = github.context.eventName;
    const payload = github.context.payload;

    logger.info(`Received GitHub event: ${eventName} (action: ${payload.action || 'none'})`);

    const labelsAddedTotal: string[] = [];
    const duplicatesFound: number[] = [];
    let suggestedVersionOutput = '';
    let releaseNotesOutput = '';

    // --- FEATURE A: ISSUE TRIAGE ---
    if (eventName === 'issues' && enabledFeatures.includes('triage')) {
      const issue = payload.issue;
      if (!issue) {
        logger.warn('Event "issues" received but payload contains no issue object.');
        return;
      }

      const issueNumber = issue.number;
      const title = issue.title || '';
      const body = issue.body || '';
      const existingLabels = (issue.labels || []).map((l: { name: string }) => l.name);

      logger.startGroup(`Triage processing for Issue #${issueNumber}`);

      // 1. Auto-labeling (only on opened; preserve maintainer edits)
      let labelsToAdd: string[] = [];
      if (payload.action === 'opened') {
        labelsToAdd = determineLabelsToAdd(config.triage.labels, {
          title,
          body,
          existingLabels,
        });

        if (labelsToAdd.length > 0) {
          logger.info(`Adding labels to #${issueNumber}: ${labelsToAdd.join(', ')}`);
          const applied = await client.addLabels(issueNumber, labelsToAdd);
          labelsAddedTotal.push(...applied);
        } else {
          logger.info(`No new labels matched for #${issueNumber}.`);
        }
      }

      // Combine existing + newly added labels for required-info check
      const currentLabels = Array.from(new Set([...existingLabels, ...labelsToAdd]));

      // 2. Missing-information check
      await processRequiredInfo({
        client,
        issueNumber,
        body,
        labels: currentLabels,
        requiredInfoConfig: config.triage.requiredInfo,
        needsInfoLabel: config.triage.needsInfoLabel,
      });

      // 3. Duplicate detection
      if (config.triage.duplicates.enabled && payload.action === 'opened') {
        const matches = await detectDuplicateIssues({
          client,
          currentIssueNumber: issueNumber,
          title,
          body,
          threshold: config.triage.duplicates.threshold,
          maxSuggestions: config.triage.duplicates.maxSuggestions,
          includeClosedDays: config.triage.duplicates.includeClosedDays,
        });

        if (matches.length > 0) {
          labelsAddedTotal.push('possible-duplicate');
          duplicatesFound.push(...matches.map((m) => m.number));
        }
      }

      // 4. Welcome message (optional, off by default)
      if (
        config.triage.welcomeMessage.enabled &&
        payload.action === 'opened' &&
        (issue.author_association === 'FIRST_TIME_CONTRIBUTOR' ||
          issue.author_association === 'FIRST_TIMER')
      ) {
        await postOrUpdateStickyComment(
          client,
          issueNumber,
          COMMENT_MARKERS.WELCOME_MESSAGE,
          config.triage.welcomeMessage.message,
        );
      }

      logger.endGroup();
    }

    // --- FEATURE B: PULL REQUEST ANALYSIS ---
    if (
      (eventName === 'pull_request' || eventName === 'pull_request_target') &&
      enabledFeatures.includes('pull-requests')
    ) {
      const pr = payload.pull_request;
      if (!pr) {
        logger.warn(`Event "${eventName}" received but payload contains no pull_request object.`);
        return;
      }

      const prNumber = pr.number;
      const title = pr.title || '';
      const body = pr.body || '';
      const existingLabels = (pr.labels || []).map((l: { name: string }) => l.name);

      logger.startGroup(`Pull Request Analysis for PR #${prNumber}`);

      // Fetch files changed in PR
      const files = await client.listPullRequestFiles(prNumber);
      logger.info(`Fetched ${files.length} changed file(s) for PR #${prNumber}`);

      const analysis = analyzePullRequest({
        files,
        title,
        body,
        config: config.pullRequests,
      });

      // Render report and post/update sticky comment
      const reportMarkdown = generatePRReportMarkdown(analysis);
      await postOrUpdateStickyComment(
        client,
        prNumber,
        COMMENT_MARKERS.PR_REPORT,
        reportMarkdown,
      );

      // Handle size labels: add current, remove outdated
      const outdatedSizes = determineOutdatedSizeLabels(existingLabels, analysis.sizeLabel);
      for (const oldLabel of outdatedSizes) {
        await client.removeLabel(prNumber, oldLabel);
      }

      if (!existingLabels.includes(analysis.sizeLabel)) {
        await client.addLabels(prNumber, [analysis.sizeLabel]);
        labelsAddedTotal.push(analysis.sizeLabel);
      }

      // Area labels (apply non-existing)
      const newAreaLabels = analysis.areaLabels.filter((l) => !existingLabels.includes(l));
      if (newAreaLabels.length > 0) {
        await client.addLabels(prNumber, newAreaLabels);
        labelsAddedTotal.push(...newAreaLabels);
      }

      logger.endGroup();
    }

    // --- FEATURE C: RELEASE DRAFTING ---
    const releaseEventNames = ['workflow_dispatch', 'schedule', 'release'];
    const isTagPush =
      eventName === 'push' && Boolean(payload.ref && payload.ref.startsWith('refs/tags/'));
    const isReleaseEvent = releaseEventNames.includes(eventName) || isTagPush;

    if (enabledFeatures.includes('release')) {
      if (!isReleaseEvent) {
        logger.info(`Release drafting skipped: event "${eventName}" is not a release event.`);
        stepSummary.addItem({
          type: 'release',
          title: 'Release drafting skipped',
          details: `Event "${eventName}" is not a release event (expected workflow_dispatch, tag push, schedule, or release)`,
          status: 'skipped',
        });
      } else {
        logger.startGroup('Release Drafting');

        // 1. Find latest release or tag
        const latest = await getLatestReleaseOrTag(client);
        logger.info(`Latest tag detected: ${latest.tagName || 'none'} (date: ${latest.publishedAt || 'none'})`);

        // 2. Collect merged PRs
        const { prs, firstTimeContributors } = await collectMergedPRs(client, latest.publishedAt, {
          excludeBots: config.release.excludeBots,
        });
        logger.info(`Collected ${prs.length} merged PRs for release drafting.`);

        // 3. Classify PRs
        const { classified } = classifyPullRequests(prs, config.release);

        // 4. Determine semver bump
        const bumpType = determineBumpType(
          classified.map((c) => ({
            isBreaking: c.isBreaking,
            type: c.conventionalType,
          })),
        );

        const targetVersion = releaseTagInput || bumpVersion(latest.tagName, bumpType);
        suggestedVersionOutput = targetVersion;
        logger.info(`Suggested next version: ${targetVersion} (bump type: ${bumpType})`);

        // 5. Generate release notes
        releaseNotesOutput = generateReleaseNotes({
          version: targetVersion,
          previousVersion: latest.tagName || undefined,
          classifiedPRs: classified,
          config: config.release,
          firstTimeContributors,
        });

        // 6. Create draft release
        await client.createDraftRelease({
          tagName: targetVersion,
          name: `Release ${targetVersion}`,
          body: releaseNotesOutput,
        });

        logger.endGroup();
      }
    }

    // Set outputs
    core.setOutput('labels-added', dryRun ? '' : Array.from(new Set(labelsAddedTotal)).join(', '));
    core.setOutput('duplicates-found', JSON.stringify(duplicatesFound));
    core.setOutput('suggested-version', suggestedVersionOutput);
    core.setOutput('release-notes', releaseNotesOutput);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(errorMsg);
    core.setFailed(errorMsg);
  } finally {
    try {
      await stepSummary.write();
    } catch (err: unknown) {
      logger.warn(`Failed to write step summary: ${String(err)}`);
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  run();
}
