# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-17

### Added
- **Issue Triage**:
  - Deterministic keyword and regex auto-labeling for issues (`bug`, `question`, `enhancement`, etc.).
  - Missing-information validator detecting empty and placeholder sections in markdown headings and issue forms.
  - Sticky comments for triage information, automatically resolving and removing `needs-info` when reporters provide details.
  - TF-IDF and Cosine Similarity duplicate issue detection without external ML dependencies.
  - Welcome message support for first-time contributors.
- **Pull Request Analysis**:
  - Automated size labeling (`size/XS`, `size/S`, `size/M`, `size/L`, `size/XL`).
  - Sticky PR review summary reporting additions, deletions, and folder breakdowns.
  - Tests check warning when source files change without accompanying test modifications.
  - Documentation check warning when public-facing paths change without docs or changelog updates.
  - Sensitive and risky paths detection (auth, migrations, workflows, lockfiles).
  - Conventional Commits title format validation.
  - Linked closing issue reference check.
- **Release Drafting**:
  - Automated collection of merged PRs since previous tag or release.
  - Multi-tier PR classification based on labels and Conventional Commit types.
  - Automatic semantic version bump calculation (`major`, `minor`, `patch`).
  - Markdown release notes generator with category groupings and New Contributors recognition.
  - Draft GitHub Release creation (never auto-publishes).
- **Cross-cutting**:
  - Zero-config default operation with optional `.github/maintainerkit.yml` or `.github/tendr.yml`.
  - Comprehensive dry-run mode writing previews to `GITHUB_STEP_SUMMARY` without modifying repository state.
  - Idempotent sticky comments using hidden HTML markers.
  - High-resilience API retries on 403 and 429 rate limit errors.
