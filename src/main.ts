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
import { COMMENT_MARKERS, postOrUpdateStickyComment } from './github/comments';
import { logger } from './util/logger';
import { stepSummary } from './util/summary';

export async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';
    if (!token) {
      throw new Error('No GitHub token provided. Ensure "github-token" input is set.');
    }
    core.setSecret(token);

    const configPath = core.getInput('config-path') || '.github/maintainerkit.yml';
    const dryRun = core.getInput('dry-run') === 'true';
    const featuresInput = core.getInput('features') || 'triage,pull-requests';
    const enabledFeatures = featuresInput
      .split(',')
      .map((f) => f.trim().toLowerCase())
      .filter(Boolean);

    logger.info(`MaintainerKit initialized (dryRun: ${dryRun}, features: ${enabledFeatures.join(', ')})`);
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

      // 1. Auto-labeling
      const labelsToAdd = determineLabelsToAdd(config.triage.labels, {
        title,
        body,
        existingLabels,
      });

      if (labelsToAdd.length > 0) {
        logger.info(`Adding labels to #${issueNumber}: ${labelsToAdd.join(', ')}`);
        await client.addLabels(issueNumber, labelsToAdd);
        labelsAddedTotal.push(...labelsToAdd);
      } else {
        logger.info(`No new labels matched for #${issueNumber}.`);
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

    // Set outputs
    core.setOutput('labels-added', labelsAddedTotal.join(','));
    core.setOutput('duplicates-found', JSON.stringify(duplicatesFound));
    core.setOutput('suggested-version', '');
    core.setOutput('release-notes', '');

    // Write job summary
    await stepSummary.write();
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(errorMsg);
    core.setFailed(errorMsg);
  }
}

if (process.env.NODE_ENV !== 'test') {
  run();
}
