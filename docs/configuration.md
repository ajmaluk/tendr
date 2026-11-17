# Configuration Reference

Tendr is configured via `.github/tendr.yml` (with automatic fallback to `.github/maintainerkit.yml`).

If no configuration file is present, Tendr operates using **zero-config sensible defaults**.

---

## Complete Example

```yaml
# .github/tendr.yml
triage:
  labels:
    - label: bug
      keywords: ["crash", "exception", "traceback", "doesn't work", "regression", "broken", "not working", "error", "fails", "failure"]
      patterns: ["^panic:", "segfault"]
    - label: question
      keywords: ["how do i", "how to", "is it possible"]
    - label: enhancement
      keywords: ["feature request", "would be nice", "please add"]
  required-info:
    bug: ["version", "steps to reproduce", "expected", "actual"]
  needs-info-label: needs-info
  duplicates:
    enabled: true
    threshold: 0.55
    max-suggestions: 3
    include-closed-days: 180
  welcome-message:
    enabled: false
    message: "Thank you for opening your first issue! Welcome to our community."

pull-requests:
  size-thresholds:
    xs: 10
    s: 50
    m: 250
    l: 1000
  test-globs:
    - "**/*.test.*"
    - "**/*.spec.*"
    - "tests/**"
    - "__tests__/**"
  docs-globs:
    - "README.md"
    - "docs/**"
    - "CHANGELOG.md"
  risky-globs:
    - "**/auth/**"
    - "**/migrations/**"
    - ".github/workflows/**"
    - "package-lock.json"
  require-conventional-title: true
  require-linked-issue: false

release:
  categories:
    - title: "Breaking Changes"
      labels: ["breaking"]
    - title: "Features"
      labels: ["enhancement"]
      types: ["feat"]
    - title: "Bug Fixes"
      labels: ["bug"]
      types: ["fix"]
    - title: "Documentation"
      types: ["docs"]
    - title: "Maintenance"
      types: ["chore", "refactor", "ci", "build", "test"]
```

---

## Detailed Options

### `triage`

| Key | Type | Default | Description |
|---|---|---|---|
| `labels` | array | *See default list* | Rules for auto-labeling based on keyword or regex pattern match against title and body. |
| `labels[].label` | string | **required** | The exact GitHub label name to apply. |
| `labels[].keywords` | array | `[]` | Substrings matched case-insensitively. |
| `labels[].patterns` | array | `[]` | Regular expression strings. |
| `required-info` | object | `{ bug: ['version', 'steps to reproduce', 'expected', 'actual'] }` | Map of label names to required section headings. |
| `needs-info-label` | string | `"needs-info"` | Label attached when required info is missing; removed when resolved. |
| `duplicates.enabled` | boolean | `true` | Enables TF-IDF duplicate issue similarity check. |
| `duplicates.threshold` | number | `0.55` | Minimum cosine similarity score (0.0 to 1.0) required to flag an issue. |
| `duplicates.max-suggestions` | number | `3` | Maximum number of duplicate issues to mention in sticky comment. |
| `duplicates.include-closed-days` | number | `180` | Lookback window in days for comparing against closed issues (`0` = open issues only). |
| `welcome-message.enabled` | boolean | `false` | When true, posts a welcome greeting to first-time contributors. |
| `welcome-message.message` | string | *Friendly default* | Markdown text for the welcome greeting. |

---

### `pull-requests`

| Key | Type | Default | Description |
|---|---|---|---|
| `size-thresholds.xs` | number | `10` | Maximum lines changed for `size/XS`. |
| `size-thresholds.s` | number | `50` | Maximum lines changed for `size/S`. |
| `size-thresholds.m` | number | `250` | Maximum lines changed for `size/M`. |
| `size-thresholds.l` | number | `1000` | Maximum lines changed for `size/L` (greater is `size/XL`). |
| `test-globs` | array | `["**/*.test.*", "**/*.spec.*", "tests/**", "__tests__/**"]` | Glob patterns identifying test files. |
| `docs-globs` | array | `["README.md", "docs/**", "CHANGELOG.md"]` | Glob patterns identifying documentation files. |
| `risky-globs` | array | `["**/auth/**", "**/migrations/**", ".github/workflows/**", "package-lock.json"]` | Sensitive files flagged for extra review. |
| `require-conventional-title` | boolean | `true` | Validates PR title against Conventional Commits. |
| `require-linked-issue` | boolean | `false` | Flags PR descriptions missing `fixes #N`, `closes #N`, etc. |

---

### `release`

| Key | Type | Default | Description |
|---|---|---|---|
| `exclude-bots` | boolean | `false` | When true, excludes bot-authored PRs from release notes entirely. (Bot accounts are always excluded from New Contributors). |
| `categories` | array | *Standard categories* | Category sections in release notes. |
| `categories[].title` | string | **required** | Heading displayed in release notes. |
| `categories[].labels` | array | `[]` | Labels mapping PRs to this category. |
| `categories[].types` | array | `[]` | Conventional Commit types mapping PRs to this category. |
