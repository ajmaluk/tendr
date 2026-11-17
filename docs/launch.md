# Tendr Launch & Distribution Guide

This document outlines the steps to publish Tendr to GitHub Marketplace, launch on Hacker News, publish technical articles, and distribute across the open-source community.

---

## 1. 🚀 GitHub Marketplace Publishing Steps

1. **Tag the Release**:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```
2. **Navigate to GitHub Releases**:
   - Go to `https://github.com/ajmaluk/tendr/releases/new?tag=v1.0.0`.
3. **Publish to Marketplace**:
   - Check the box: **"Publish this Action to the GitHub Marketplace"**.
   - Review categories: Select **Code quality** and **Dependency management** (or Project management).
   - Ensure `action.yml` metadata is validated:
     - Name: `Tendr MaintainerKit`
     - Description: `<= 125 chars`
     - Icon & Color: set in `action.yml`
4. **Publish Release**:
   - Click **Publish release**. Tendr is now live on the GitHub Marketplace!

---

## 2. 📢 Draft Show HN Post

**Title**: Show HN: Tendr – Free, rules-based GitHub Action for issue triage and PR analysis

**URL / Text**:
```markdown
Hi HN! I built Tendr (https://github.com/ajmaluk/tendr), a 100% free, deterministic GitHub Action to help maintainers handle issue triage, PR analysis, and draft release notes.

The Problem:
Maintaining an open source project often feels like being an unpaid receptionist. People open issues saying "app broken" with zero logs, PRs get submitted modifying critical auth paths without tests, and you spend your weekends writing changelogs.

Why another tool?
Most automated triage tools either:
1. Require paid SaaS subscriptions or send your code/issues to third-party LLM APIs.
2. Are overly aggressive and auto-close issues with robotic messages that alienate contributors.

Tendr takes a different approach:
- 100% Free & Local: Runs entirely on GitHub's free runner using the default GITHUB_TOKEN. No data leaves GitHub.
- Deterministic: Uses regex, keyword rules, and an in-memory TF-IDF + cosine similarity engine (no heavy ML libraries) to detect duplicates.
- Maintainer in Control: Tendr NEVER auto-merges, auto-closes, or deletes anything. It only comments and labels.
- Safe by default: Full dry-run mode (logs what it would do to the job summary without making write calls).

Quick install (.github/workflows/tendr.yml):
```yaml
name: Tendr
on:
  issues:
    types: [opened, edited]
  pull_request_target:
    types: [opened, synchronize, reopened]

permissions:
  issues: write
  pull-requests: write
  contents: read

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: ajmaluk/tendr@v1
        with:
          dry-run: true # preview actions before turning live
```

I'd love feedback from fellow maintainers on what rules or checks would be most helpful in your daily workflow!
```

---

## 3. 📝 Draft Dev.to / Hashnode Article Outline

**Title**: How I Built a Free, Deterministic GitHub Triage Bot with Zero Cloud Costs and No LLMs

**Outline**:
1. **Introduction**: The hidden burden of open-source maintenance.
2. **The "AI Fatigue" Dilemma**: Why expensive LLM wrappers often fail at deterministic repository hygiene.
3. **Core Features**:
   - How to catch missing issue details and automatically clear the warning when fixed.
   - Vector search without Python or heavy ML: Implementing pure TypeScript TF-IDF and Cosine Similarity for duplicate detection.
   - The sticky PR report: Catching risky file edits and missing tests before review.
   - Automating release notes from Conventional Commits.
4. **Security When Building GitHub Actions**:
   - Why `pull_request_target` requires zero-code-checkout discipline.
   - Guarding against ReDoS in user-provided regexes.
   - Preventing mention spam with zero-width character escaping.
5. **Conclusion & Open Source Repository Link**.

---

## 4. 🌐 Communities to Share

- **Hacker News**: Show HN
- **Reddit**: `r/opensource`, `r/github`, `r/typescript`, `r/webdev`
- **Product Hunt**: Launching as a free developer tool
- **Dev.to / Hashnode / Medium**: Technical walkthrough article
- **Twitter / X / Bluesky**: Quick demo GIF showing PR size and issue triage in action
- **GitHub Discussions / Communities**: Open source maintainer working groups
