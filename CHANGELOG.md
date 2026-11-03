# Changelog

## 0.3.0

### Added

- Project structure validation with `ai-rules/project-structure`.
- `frontend`, `backend` and `other` presets.
- Custom structure DSL with folder hierarchy, dynamic folders, casing, prefixes, suffixes and regex patterns.
- `relations` DSL for layer-based import boundaries backed by `eslint-plugin-boundaries`.
- `allow`/`deny` rules per layer, with same-layer and external imports allowed by default.
- Configurable type-only import exemptions, blocked by default.
- `ai-rules/project-setup` console warning when project structure validation is not configured.
- `AI_RULES_SILENT=1` to suppress the configuration warning.
- Nested `rootFolder` support with parent config ignores.
- ESM and CJS type declarations via conditional `exports`.
- Consumer smoke test, package checks and coverage script.

### Changed

- Runtime dependencies are `@stylistic/eslint-plugin`, `eslint-plugin-import-x`, `eslint-plugin-boundaries`, `eslint-import-resolver-typescript` and `typescript-eslint`.
- Minimum Node.js version is now 20.
- ESLint peer range is now `^9.22.0 || ^10.0.0`.
- TypeScript peer range is now `>=5.0.0 <6.1.0`.
- `projects()` includes the recommended rules and scopes them to each project root.
- `projects()` disables `ai-rules/filename-pascal-case` because file names are validated by `project-structure`.
- `prepublishOnly` now refuses to publish with any uncommitted, staged or untracked changes.

### Removed

- `@eslint/js` and `globals` from runtime dependencies.
