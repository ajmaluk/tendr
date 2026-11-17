import { PRAnalysisResult } from './analyze';

/**
 * Generates the factual markdown report for a pull request.
 */
export function generatePRReportMarkdown(result: PRAnalysisResult): string {
  const lines: string[] = [];

  lines.push('### 📊 Pull Request Analysis');
  lines.push('');

  // Overview metrics
  lines.push(
    `**Changes**: **${result.totalFiles}** file(s) modified (**+${result.additions}** / **-${result.deletions}** lines, total: **${result.totalChanges}**) · **Size**: \`${result.sizeLabel}\``,
  );
  lines.push('');

  // Area Breakdown Table
  if (result.areaGroups && result.areaGroups.length > 0) {
    lines.push('#### 📂 Changes by Area');
    lines.push('');
    lines.push('| Area | Files | Changes (+ / -) |');
    lines.push('| :--- | :---: | :---: |');
    for (const group of result.areaGroups) {
      lines.push(
        `| \`${group.area}/\` | ${group.filesCount} | +${group.additions} / -${group.deletions} |`,
      );
    }
    lines.push('');
  }

  // Quality & Risk Checks
  lines.push('#### 🛡️ Checks & Review Guidance');
  lines.push('');

  // 1. Tests check
  if (result.needsTestsWarning) {
    lines.push(
      '- ⚠️ **Tests Missing**: Source files were modified, but no test changes were detected. Please ensure test coverage is added or updated.',
    );
  } else if (result.hasTestChanges) {
    lines.push('- ✅ **Tests**: Test changes detected.');
  }

  // 2. Docs check
  if (result.needsDocsWarning) {
    lines.push(
      '- ℹ️ **Documentation**: No documentation changes were included. If this PR introduces user-facing changes, please update relevant documentation.',
    );
  }

  // 3. Risky paths check
  if (result.riskyFiles.length > 0) {
    lines.push(
      `- ⚠️ **Sensitive Paths**: **${result.riskyFiles.length}** critical file(s) modified that require extra review:`,
    );
    const MAX_SHOWN_RISKY = 20;
    const shown = result.riskyFiles.slice(0, MAX_SHOWN_RISKY);
    for (const rf of shown) {
      lines.push(`  - \`${rf}\``);
    }
    if (result.riskyFiles.length > MAX_SHOWN_RISKY) {
      lines.push(`  - *…and ${result.riskyFiles.length - MAX_SHOWN_RISKY} more*`);
    }
  }

  // 4. Conventional title check
  if (!result.isConventionalTitleValid) {
    lines.push(
      '- ❌ **Title Format**: PR title does not follow the [Conventional Commits](https://www.conventionalcommits.org/) format (e.g. `feat: description` or `fix(scope): description`).',
    );
  } else if (result.conventionalTitle.isValid) {
    lines.push(
      `- ✅ **Title Format**: Valid Conventional Commit (\`${result.conventionalTitle.type}${result.conventionalTitle.scope ? `(${result.conventionalTitle.scope})` : ''}\`).`,
    );
  }

  // 5. Linked issue check
  if (result.linkedIssueWarning) {
    lines.push(
      '- ⚠️ **Linked Issue**: No closing reference (e.g. `fixes #123`, `closes #456`) found in the PR description.',
    );
  } else if (result.hasLinkedIssue) {
    lines.push('- ✅ **Linked Issue**: Closing issue reference detected.');
  }

  lines.push('');
  lines.push('---');
  lines.push('*Automated review by Tendr · Maintainers stay in control*');

  return lines.join('\n');
}
