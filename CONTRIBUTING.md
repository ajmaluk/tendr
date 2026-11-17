# Contributing to Tendr (MaintainerKit)

Thank you for your interest in contributing to Tendr! We are excited to collaborate with open-source contributors to make GitHub maintenance simple, deterministic, and safe.

---

## 🛠️ Development Setup

1. **Prerequisites**:
   - Node.js `20.x` or `24.x`
   - npm `10.x` or higher
   - Git

2. **Clone and Install**:
   ```bash
   git clone https://github.com/ajmaluk/tendr.git
   cd tendr
   npm install
   ```

3. **Verify Everything Runs**:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   npm run build
   ```

---

## 📦 Golden Rule: Rebuild `dist/` Before Committing

Tendr is distributed as a pre-compiled GitHub Action. GitHub Actions runs directly against `dist/index.js`.

Whenever you modify any file in `src/`, you **must** regenerate the bundle:

```bash
npm run build
git add dist/
```

Our CI pipeline (`check-dist.yml`) strictly enforces this rule. Pull requests with an outdated `dist/` will fail CI automatically.

---

## 🧪 Testing

We aim for **85%+ test coverage** across all modules.

- Run all unit and integration tests:
  ```bash
  npm test
  ```
- Run tests with full v8 coverage report:
  ```bash
  npm run test:coverage
  ```
- Run tests in watch mode during development:
  ```bash
  npm run test:watch
  ```

---

## ✍️ Commit Conventions

We strictly follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` A new feature or rule
- `fix:` A bug fix
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `chore:` Maintenance, dependency bumps, tooling
- `refactor:` Code refactoring without changing observable behavior

Example:
```bash
git commit -m "feat(triage): add support for custom issue form headings"
```

---

## 🧩 How to Add a New Rule or Feature

1. **Configuration Schema**:
   - Update `src/config/schema.ts` with your new options and default values.
   - Update tests in `tests/config.test.ts`.
2. **Logic Implementation**:
   - Keep functions pure and deterministic in their domain module (`src/triage/`, `src/pr/`, or `src/release/`).
   - Side effects (API write calls) belong only in `src/github/client.ts` and `src/main.ts`.
3. **Write Tests**:
   - Add unit tests with fixtures in `tests/`. Verify both positive and negative cases.
   - Ensure dry-run behavior is verified (must make zero write calls).
4. **Documentation**:
   - Document the new configuration keys in `docs/configuration.md`.
   - Update the configuration reference in `README.md` if relevant.
5. **Rebuild**:
   - Run `npm run build` and ensure `dist/` is committed.
