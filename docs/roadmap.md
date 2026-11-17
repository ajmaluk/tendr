# Tendr Project Roadmap & Good First Issues

We welcome contributions from developers of all skill levels! Here is our current roadmap along with curated **Good First Issues** ready for contribution.

---

## 🌟 Good First Issues

### 1. `good-first-issue`: Add Custom Stopword List Configuration
- **Area**: `src/text/tokenize.ts`, `src/config/schema.ts`
- **Goal**: Allow repository maintainers to specify custom stopwords in `.github/maintainerkit.yml` (e.g. domain-specific words like "component", "button", "app" that appear frequently in their repo).
- **Difficulty**: Easy

### 2. `good-first-issue`: Add Support for Spanish and French Stopwords
- **Area**: `src/text/tokenize.ts`
- **Goal**: Add a `language` configuration option to `duplicates` supporting Spanish (`es`) and French (`fr`) stopword lists.
- **Difficulty**: Easy

### 3. `good-first-issue`: Configurable Auto-Label Color Creation
- **Area**: `src/github/client.ts`
- **Goal**: If an auto-assigned label does not exist in the repository, create it with a pleasant default color (e.g. light red for bugs, blue for enhancements) before attaching it.
- **Difficulty**: Medium

### 4. `good-first-issue`: Support Additional Issue Closing Keywords
- **Area**: `src/pr/analyze.ts`
- **Goal**: Expand closing keyword regex to support multilingual or custom keywords (e.g. `addressed in #123`, `implements #123`).
- **Difficulty**: Easy

### 5. `good-first-issue`: Visual PR Diff Stat Bar in Report
- **Area**: `src/pr/report.ts`
- **Goal**: Render a GitHub-style green/red unicode progress bar for PR additions and deletions (e.g. `████░░░░░░ +40 / -10`) in the sticky comment.
- **Difficulty**: Easy

### 6. `good-first-issue`: Custom Prefix for Size Labels
- **Area**: `src/pr/size.ts`, `src/config/schema.ts`
- **Goal**: Allow maintainers to configure label prefix (e.g. `PR: size/M` instead of `size/M`).
- **Difficulty**: Easy

### 7. `good-first-issue`: Release Notes Custom Header Template
- **Area**: `src/release/notes.ts`
- **Goal**: Allow users to define a custom markdown header or footer template for release notes in configuration.
- **Difficulty**: Medium

---

## 🚀 Future Roadmap

- **Milestone 2**: Discussion thread triage and Q&A labeling.
- **Milestone 3**: Stale issue gentle reminders (with strict confirmation rules, never auto-closing without maintainer opt-in).
- **Milestone 4**: Interactive CLI mode for testing rules against historical issues locally (`npx tendr-cli test`).
