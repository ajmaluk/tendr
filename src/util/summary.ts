import * as core from '@actions/core';

export interface SummaryActionItem {
  type: 'label' | 'comment' | 'duplicate' | 'pr-check' | 'release';
  title: string;
  details?: string;
  status: 'applied' | 'would-apply' | 'skipped' | 'failed' | 'info';
}

export class StepSummaryManager {
  private items: SummaryActionItem[] = [];
  private dryRun = false;

  constructor(dryRun = false) {
    this.dryRun = dryRun;
  }

  setDryRun(dryRun: boolean): void {
    this.dryRun = dryRun;
  }

  addItem(item: SummaryActionItem): void {
    this.items.push(item);
  }

  async write(): Promise<void> {
    if (this.items.length === 0) {
      return;
    }

    if (!process.env.GITHUB_STEP_SUMMARY) {
      // In local tests or environments where GITHUB_STEP_SUMMARY is not set, skip writing gracefully
      return;
    }

    core.summary.addHeading('MaintainerKit Summary', 2);

    if (this.dryRun) {
      core.summary.addRaw(
        '> ⚠️ **DRY-RUN MODE ACTIVE**: No changes were written to GitHub. The actions below are previews of what would have run.\n\n',
      );
    }

    const rows = [
      [
        { data: 'Category', header: true },
        { data: 'Action', header: true },
        { data: 'Status', header: true },
        { data: 'Details', header: true },
      ],
    ];

    for (const item of this.items) {
      const statusIcon =
        item.status === 'applied'
          ? '✅ Applied'
          : item.status === 'would-apply'
            ? '🔍 Planned (Dry-Run)'
            : item.status === 'skipped'
              ? '⏭️ Skipped'
              : item.status === 'failed'
                ? '❌ Failed'
                : 'ℹ️ Info';

      rows.push([
        { data: item.type, header: false },
        { data: item.title, header: false },
        { data: statusIcon, header: false },
        { data: item.details || '-', header: false },
      ]);
    }

    core.summary.addTable(rows);
    await core.summary.write();
  }
}

export const stepSummary = new StepSummaryManager();
