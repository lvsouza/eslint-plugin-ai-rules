# Changelog

## Unreleased

### Added

- `rules` option on project definitions. It uses the standard ESLint rule format and is applied after recommended, preset and automatic structure/relations rules, so any rule can be disabled or have its severity/options changed.
- Documentation and tests covering rule opt-out through flat-config overrides after `projects()`/`recommended`.

### Changed

- `ai-rules/project-setup` now reports a regular ESLint diagnostic instead of using `console.warn`. Its severity now behaves like any other rule (`off`, `warn`, `error`).
- Rule names and IDs are centralized in `src/rules/constants.ts` to prevent naming drift.

## 0.3.0

### Added

- Project structure validation with `ai-rules/project-structure`.
- `frontend`, `backend` and `other` presets.
- Custom structure DSL with folder hierarchy, dynamic folders, casing, prefixes, suffixes and regex patterns.
- `relations` DSL for layer-based import boundaries backed by `eslint-plugin-boundaries`.
- Backend and frontend presets now ship default architecture relation rules.
- Backend preset covers `database`, `repositories`, generic `services/<service-kebab>` modules and `test`.
- Frontend preset models global layers under `src/shared` plus page-local scopes.
- `allowSameLayer` to block imports within the same layer.
- `scope` to restrict local imports to the same page.
- `allow`/`deny` rules per layer, with external imports allowed by default.
- Configurable type-only import exemptions, blocked by default.
- `ai-rules/project-setup` console warning when project structure validation is not configured.
- `AI_RULES_SILENT=1` to suppress the configuration warning.
- Nested `rootFolder` support with parent config ignores.
- ESM and CJS type declarations via conditional `exports`.
- Consumer smoke test, package checks and coverage script.

### Changed

- Runtime dependencies are `@stylistic/eslint-plugin`, `eslint-plugin-import-x`, `eslint-plugin-boundaries` and `typescript-eslint`.
- `eslint-import-resolver-typescript` is now a peer dependency used by `relations`.
- Minimum Node.js version is now 20.
- ESLint peer range is now `^9.22.0 || ^10.0.0`.
- TypeScript peer range is now `>=5.0.0 <6.1.0`.
- `projects()` includes the recommended rules and scopes them to each project root.
- `projects()` disables `ai-rules/filename-pascal-case` because file names are validated by `project-structure`.
- The plugin version is injected from `package.json` at build time.
- `npm publish` no longer requires a clean git tree or automatic `verify`; `prepack` still builds `dist`.

### Removed

- `@eslint/js` and `globals` from runtime dependencies.
