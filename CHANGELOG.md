# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-11-17

### Added
- **Configuration & Options**:
  - Added `release.exclude-bots` configuration option to drop bot PRs from release notes.
  - Extended default `bug` triage keywords to include `broken`, `not working`, `error`, `fails`, and `failure`.
  - Added word-boundary keyword matching to avoid false positives on substrings.
  - Added support for `Fixes: #N`, `Closes: #N`, and cross-repository `owner/repo#N` linked issue syntax.
  - Support primary `.github/tendr.yml` with transparent backward-compatible fallback to `.github/maintainerkit.yml`.
  - New `<!-- tendr:... -->` comment markers with automatic backward-compatible adoption of existing `<!-- maintainerkit:... -->` comments.

### Fixed & Hardened
- **Safety & Idempotency**:
  - Gated release drafting strictly to release events (`workflow_dispatch`, tag `push`, `schedule`, `release`), preventing accidental release creation on issue or PR events.
  - Made draft release creation idempotent by updating existing draft releases for the same tag rather than creating duplicates.
  - Hardened `dry-run` input parsing to reject invalid values and guarantee zero writes on malformed inputs.
  - Fixed required-info section parser to ignore code blocks, disallow URL schemes from starting sections, ignore non-alphanumeric headings, and match exact headings first.
  - Fixed duplicate issue detection window to query open and closed issues separately, respect `includeClosedDays: 0` (open only), and cap candidate issues at 1,000.
  - Bot accounts are excluded from New Contributors.
  - Filtered moving major tags (`v1`) from latest version detection to prevent duplicate version bumps.
  - Optimized closed PR collection with early pagination termination once `updated_at` precedes the release window.
  - Enhanced retry logic: retries only on rate limits (429 or rate-limited 403s with `retry-after`/reset headers); permission 403s fail immediately with actionable workflow permission guidance.
  - Non-404 configuration load errors (e.g., 403/500) now fail the run with clear diagnostic errors instead of silently reverting to defaults.
  - Capped sensitive paths listing at 20 files with `…and N more`, and guarded sticky comments at 60,000 characters to prevent GitHub 422 payload errors.
  - Added workflow `concurrency` blocks to prevent race conditions during rapid consecutive events.
  - Restricted auto-labeling to `opened` events, preserving intentional manual edits by maintainers.
  - Stale `needs-info` labels and comments are now cleaned up when issue labels change and required sections no longer apply.
  - `labels-added` output accurately reflects applied labels and returns empty in dry-run; job summary is guaranteed to write in a `finally` block even on failure.

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
