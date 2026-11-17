# Real-World Configuration Examples

This guide provides tested recipes for common repository setups.

---

## 1. Minimal Zero-Config Setup

Works immediately without creating any YAML configuration file.

`.github/workflows/tendr.yml`:
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
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 2. Monorepo Configuration

Detects changes and applies area labels for specific packages or services:

```yaml
# .github/maintainerkit.yml
triage:
  labels:
    - label: frontend
      keywords: ["ui", "button", "css", "react", "tailwind"]
    - label: backend
      keywords: ["api", "database", "postgres", "sql", "redis"]
    - label: infra
      keywords: ["docker", "k8s", "terraform", "helm", "deploy"]
  required-info:
    bug: ["version", "steps to reproduce", "expected", "actual"]

pull-requests:
  size-thresholds:
    xs: 20
    s: 100
    m: 400
    l: 1200
  risky-globs:
    - "packages/core/auth/**"
    - "services/*/migrations/**"
    - ".github/workflows/**"
  test-globs:
    - "packages/**/__tests__/**"
    - "services/**/*.spec.ts"
  docs-globs:
    - "docs/**"
    - "packages/*/README.md"
```

---

## 3. Strict Triage & Security-Focused Repository

For high-profile projects requiring strict reproduction steps and high-risk awareness:

```yaml
# .github/maintainerkit.yml
triage:
  needs-info-label: "status/needs-more-info"
  required-info:
    bug:
      - "environment"
      - "steps to reproduce"
      - "minimal reproducible example"
      - "expected behavior"
      - "actual behavior"
  duplicates:
    threshold: 0.50
    max-suggestions: 5
    include-closed-days: 365

pull-requests:
  require-conventional-title: true
  require-linked-issue: true
  risky-globs:
    - "**/crypto/**"
    - "**/security/**"
    - "**/auth/**"
    - "**/jwt/**"
    - "package-lock.json"
    - "pnpm-lock.yaml"
```
