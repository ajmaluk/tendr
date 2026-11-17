## Description
<!-- Provide a clear description of the change, including motivation and context. -->

Fixes #<!-- insert issue number, e.g. 123 -->

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] 💡 New feature (non-breaking change which adds functionality)
- [ ] ⚠️ Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🧹 Maintenance / Chore / Refactor

## PR Checklist
Please verify the following before requesting review:
- [ ] Title adheres to the [Conventional Commits](https://www.conventionalcommits.org/) format (`feat: ...`, `fix: ...`, `chore: ...`).
- [ ] Unit and integration tests have been added or updated to cover all new/modified logic.
- [ ] All tests pass locally (`npm test`).
- [ ] Linter and type checks pass cleanly (`npm run lint && npm run typecheck`).
- [ ] The bundled output in `dist/` has been regenerated via `npm run build` and committed.
- [ ] Documentation has been updated (in `README.md` or `docs/`) if applicable.
