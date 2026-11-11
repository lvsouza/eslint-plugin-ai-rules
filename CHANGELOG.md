# Changelog

## 1.1.0 - 2026-11-11

### Added

- `nextjs` preset for the Next.js App Router under `src/app`, including route files, route groups, dynamic segments, parallel and intercepting routes, plus `middleware.ts` and `instrumentation.ts`.
- Automatic creation and push of the release tag `v<version>` from the publish workflow after a successful npm publish.
- `THIRD_PARTY_NOTICES.md` listing the direct third-party dependencies, their licenses and repositories. The file is included in the published package.

### Changed

- `src/shared/components` in the `frontend` and `nextjs` presets can now import only other components and external libraries. Imports from `services`, `hooks`, `contexts`, `utils`, `helpers`, `constants` and `env` are blocked. This is a breaking change for existing frontend configurations that relied on those imports.
- All rules from `import-x`, `@stylistic`, `@typescript-eslint` and `boundaries` are now re-exported under the `ai-rules` namespace. `recommended` and `projects()` register only `ai-rules`. This is a breaking change: upstream rule IDs are no longer registered by the generated configs, so overrides must use `ai-rules/*`. Upstream settings keys such as `import-x/*` and `boundaries/*` remain unchanged.
- `ai-rules/no-default-export` and `ai-rules/no-relative-parent-imports` are enabled as `error` in `recommended` and inherited by `projects()`. This is a breaking change for projects that use default exports or import through `../`; use aliases or packages, or opt out per file or rule.

### Fixed

- Kept the development TypeScript version on the 6.0.x line and declared Node types explicitly so the `tsup` DTS pipeline and `typescript-eslint` keep working with the compiler API.

## 0.4.0 - 2026-11-04

### Added

- `rules` option on project definitions. It uses the standard ESLint rule format and is applied after recommended, preset and automatic structure/relations rules, so any rule can be disabled or have its severity/options changed.
- Documentation and tests covering rule opt-out through flat-config overrides after `projects()`/`recommended`.
- `meta.docs.url`, `meta.docs.recommended` and rule schema descriptions for all rules.
- `meta.defaultOptions` for `ai-rules/filename-pascal-case`.
- Contribution guide, security policy, code of conduct, issue and pull request templates.
- Dependabot, CodeQL, dependency review and npm provenance release workflow.

### Changed

- `ai-rules/project-setup` now reports a regular ESLint diagnostic instead of using `console.warn`. Its severity now behaves like any other rule (`off`, `warn`, `error`).
- Rule names and IDs are centralized in `src/rules/constants.ts` to prevent naming drift.
- Rule messages and comments are now consistently in English.
- The package standardizes on Yarn 1 and removes the stale `package-lock.json`.
- `publint` and `@arethetypeswrong/cli` are pinned development dependencies.
- Validation is centralized in the tag-driven release workflow, which runs the compatibility matrix, coverage, consumer and package checks before publishing. Pull requests keep dependency review and CodeQL.
- Package metadata, keywords, license copyright and npm `exports` were updated.
- The legacy `eslint/` directory was removed. `src/rules/` is the only source of truth.

### Fixed

- `test:package` now builds `dist` before running `publint` and `attw`, so it works from a clean checkout.

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
