# Changelog

## Unreleased

### Added

- `frontend` and `nextjs` presets now accept kebab-case component grouping subfolders at multiple levels (up to 10 nested groups) under `src/shared/components`, page-local `components` folders and Next.js `src/shared/pages/<page>/components`. `src/shared/components/ui` remains flat.
- `nextjs` preset now allows page-exclusive resources under `src/shared/pages/<page-kebab>/` (`components`, `hooks`, `services`, `contexts`, `helpers` and page files). The page-local relation layers are extended to these folders, keeping imports scoped to the same page.
- File-scoped `overrides` for project definitions and presets. `projects()` now returns one config per override in addition to the base project config.
- `nextjs` preset ships overrides that disable `ai-rules/no-default-export` for Next.js framework files, and all presets disable it for `*.config.{js,mjs,cjs,ts}`.
- `frontend` and `nextjs` presets allow `src/shared/assets` and `src/shared/assets/<asset-group-kebab>/` with common image, font and media files.
- `nextjs` preset adds `next-env.d.ts`, `.next/**` and `out/**` as ignored paths, supports `global-not-found.tsx`, `proxy.ts` and `instrumentation-client.ts`, and maps `src/app` as a relation layer.
- `nextjs` preset validates App Router segment names, accepting kebab-case routes, route groups, dynamic/catch-all segments, parallel routes and intercepting routes.
- New `ai-rules/app-page-scope` rule prevents an app route from importing another page under `src/shared/pages/*`.
- Frontend presets ignore `.storybook/**`, `.turbo/**`, `.vercel/**` and `storybook-static/**`.
- New recommended rules: `ai-rules/no-explicit-any`, `ai-rules/no-non-null-assertion`, `ai-rules/no-self-import`, `ai-rules/no-unresolved`, `ai-rules/no-useless-path-segments`, `ai-rules/no-extraneous-dependencies`, `ai-rules/no-cycle`, core `no-debugger` and core `no-console`.
- Optional `typeAware` project flag enables `ai-rules/no-floating-promises`, `ai-rules/no-misused-promises` and `ai-rules/await-thenable`, and configures `parserOptions.projectService`.
- TypeScript import resolution through `import-x/resolver-next` when `tsconfig.json`, `jsconfig.json` or `tsconfig.*.json` exists.

### Changed

- The merged `preset + structure` is validated after merging, and unsupported structure properties are rejected instead of being silently ignored.
- Unsupported properties in `relations`, preset overrides and project overrides are rejected.
- Override file patterns are normalized and restricted to the project `rootFolder`; negated patterns are supported.
- `projects()` now configures the TypeScript resolver even when `relations` are not present.
- `ai-rules/no-relative-parent-imports` now ignores non-relative specifiers, so aliases such as `@/` keep working with the TypeScript resolver.
- `ai-rules/no-unresolved` ignores Vite query imports such as `?raw`, `?url`, `?worker` and `?inline`.

### Breaking

- New recommended rules are enabled by default: `ai-rules/no-explicit-any`, `ai-rules/no-non-null-assertion`, `ai-rules/no-self-import`, `ai-rules/no-unresolved` and `no-debugger` as `error`; `ai-rules/no-extraneous-dependencies`, `ai-rules/no-cycle` and `no-console` as `warn`.
- `projects()` can return more than one flat config per project due to file-scoped overrides. Spreading the result continues to work; code that indexes a single config per project must be updated.
- `nextjs` preset rejects route folders that are not kebab-case or do not use a supported Next.js convention, and rejects files that are not part of the current Next.js conventions unless they are declared in the project `structure` or `overrides`.
- `ai-rules/app-page-scope` is enabled as `error` in the `nextjs` preset.

## 1.1.0 - 2026-11-11

### Added

- `nextjs` preset for the Next.js App Router under `src/app`, including route files, route groups, dynamic segments, parallel and intercepting routes, plus `middleware.ts` and `instrumentation.ts`.
- Automatic creation and push of the release tag `v<version>` and the corresponding GitHub Release with generated notes from the publish workflow after a successful npm publish.
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
