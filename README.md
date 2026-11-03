# eslint-plugin-ai-rules

[![npm version](https://img.shields.io/npm/v/eslint-plugin-ai-rules)](https://www.npmjs.com/package/eslint-plugin-ai-rules)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)
[![eslint ^9](https://img.shields.io/badge/eslint-%5E9-4B32C3)](https://eslint.org)

Flat-config only ESLint plugin that bundles useful rules for AI-generated code. Ships a `recommended` preset with all rules enabled as `error` — zero config for consumers.

> **ESLint 9+ only.** Uses flat config (`eslint.config.{ts,js}`) and `eslint/config` `defineConfig`. No legacy `.eslintrc` support.

## Features

- **AI Rules rules** — catches typical AI drift: wrong filename casing, unsorted/multiline imports, project structure drift
- **Project presets** — `frontend`, `backend` and `other` presets with folder/file structure rules
- **Custom structure** — declarative object to define folder hierarchy, folder/file casing, prefixes, suffixes and regex patterns
- **Bundled preset** — `aiRules.configs.recommended` enables custom + `import-x`, `@stylistic`, `typescript-eslint` rules out of the box
- **Autofix** — `sort-imports` and `no-multiline-imports` are `fixable: code` (`eslint --fix`)
- **Dual build** — `dist/index.js` (ESM) + `dist/index.cjs` (CJS) via `tsup`, single-file bundle, `type: module`

## Requirements

- Node `>=18` (`package.json` `engines`)
- ESLint `^9.0.0` (peer) — flat config only
- TypeScript `>=5.0.0` (peer)

`@eslint/js`, `eslint-plugin-import-x`, `@stylistic/eslint-plugin`, `typescript-eslint`, `globals` are already `dependencies` — you don't need to install them.

## Installation

```bash
# npm
npm i -D eslint-plugin-ai-rules eslint typescript

# yarn
yarn add -D eslint-plugin-ai-rules eslint typescript

# pnpm
pnpm add -D eslint-plugin-ai-rules eslint typescript

# bun
bun add -d eslint-plugin-ai-rules eslint typescript
```

## Quick Start

### `eslint.config.ts` (recommended) — you define `files`

`recommended` is file-agnostic (only `plugins` + `settings` + `rules`) and does **not** configure a parser. Pair it with `typescript-eslint` (or `@typescript-eslint/parser`) and define `files`:

```ts
import aiRules from 'eslint-plugin-ai-rules'
import tseslint from 'typescript-eslint'

export default [
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx}'], ...aiRules.configs.recommended[0] },
]
```

Alternative with `defineConfig` (ESLint >= 9.22):

```ts
import { defineConfig } from 'eslint/config'
import aiRules from 'eslint-plugin-ai-rules'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx}'], extends: aiRules.configs.recommended },
])
```

### `eslint.config.js` / `eslint.config.mjs`

```js
import aiRules from 'eslint-plugin-ai-rules'
import tseslint from 'typescript-eslint'

export default [
  ...tseslint.configs.recommended,
  { files: ['**/*.{js,ts,tsx}'], ...aiRules.configs.recommended[0] },
]
```

### With overrides

```ts
import aiRules from 'eslint-plugin-ai-rules'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  { files: ['**/*.{ts,tsx}'], ...aiRules.configs.recommended[0] },
  {
    // turn off filename check for tests or generated code
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'scripts/**/*'],
    rules: {
      'ai-rules/filename-pascal-case': 'off',
    },
  },
  {
    // or disable a bundled rule
    rules: {
      '@stylistic/semi': 'off',
    },
  },
])
```

Run:

```bash
npx eslint .
npx eslint --fix .   # autofix for sort-imports / no-multiline-imports
```

## Project structure

`aiRules.configs.projects([...])` creates one flat config per project root and enables `ai-rules/project-structure` with the resolved structure. `rootFolder` is the project root (the folder containing `package.json`), which makes frontend/backend in the same repository work.

```ts
import aiRules from 'eslint-plugin-ai-rules'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  ...aiRules.configs.projects([
    { rootFolder: 'apps/frontend', preset: 'frontend' },
    { rootFolder: 'apps/backend', preset: 'backend' },
  ]),
])
```

- `preset`: `frontend`, `backend` or `other`
- `structure`: optional custom structure merged on top of the preset
- `preset: 'other'` disables structure validation unless `structure` is provided
- Without `preset`/`structure`, only the recommended rules are scoped to the root

The generated config also:

- scopes `files` to the project root;
- adds `ignores` from the resolved `ignoredPaths`;
- disables `ai-rules/filename-pascal-case` when a structure is active, since file naming is handled by `project-structure`.

### Custom structure

```ts
export default defineConfig([
  ...aiRules.configs.projects([
    {
      rootFolder: 'apps/api',
      preset: 'backend',
      structure: {
        folders: {
          src: {
            folders: {
              'use-case': {
                folders: {
                  '[feature]': {
                    files: [
                      {
                        case: 'PascalCase',
                        suffix: 'UseCase',
                        extensions: ['.ts'],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  ]),
])
```

### Structure DSL

```ts
type TFileRule =
  | string // exact name or glob: 'index.ts', '*.spec.ts'
  | ({
      extensions: string[]
      case?: 'PascalCase' | 'camelCase' | 'kebab-case' | 'snake_case'
      prefix?: string
      suffix?: string
      pattern?: string // regex applied to the base name
    })

interface IStructureNode {
  name?: {
    case?: 'PascalCase' | 'camelCase' | 'kebab-case' | 'snake_case'
    prefix?: string
    suffix?: string
    pattern?: string
  }
  files?: TFileRule[]
  additionalFiles?: TFileRule[]
  folders?: Record<string, IStructureNode>
  ignore?: boolean
}

interface IProjectStructure extends IStructureNode {
  ignoredPaths?: string[]
}
```

- Folder keys are literal (`components`) or dynamic (`[feature]`).
- Only one dynamic folder key is allowed per level.
- `name` is applied to dynamic folders.
- String file rules match the full filename with `*`, `**`, `?` and `{a,b}`.
- Object file rules match `extensions`, then validate `case`/`prefix`/`suffix`/`pattern` against the base name.
- A file is valid when it matches at least one rule completely.
- `ignore: true` skips the subtree during structure validation.
- `ignoredPaths` is applied before the tree walk and also becomes an ESLint `ignores` entry.

### Merge: preset + structure

| Field | Behavior |
|-------|----------|
| `folders` | recursive merge by key; new keys are added |
| `files` | replaces the preset files at that node |
| `additionalFiles` | appends to the preset files |
| `name` | fields override the preset |
| `ignore` | overrides the preset |
| `ignoredPaths` | union of preset and custom paths |

To disable a preset subtree without removing it:

```ts
structure: {
  folders: {
    e2e: { ignore: true },
  },
}
```

### Presets

`frontend` and `backend` encode the reference structures used by this plugin:

- root files and folders;
- `src` hierarchy;
- `e2e` (frontend), `scripts`, `public`, `docs`;
- dynamic folders in kebab-case;
- PascalCase files with explicit exceptions;
- generated folders ignored.

Presets are exported for inspection:

```ts
import { presets } from 'eslint-plugin-ai-rules'

console.log(presets.frontend.structure)
```

> The backend preset enforces kebab-case for dynamic folders. Existing folders such as `Image` and `StockMovement` are reported and should become `image` and `stock-movement`. Use a custom `structure` with `ignore: true` during migration if needed.

## Configuration

### `recommended` preset

`src/configs/recommended.ts` exports `defineConfig([...])` with **only** `plugins` + `settings` + `rules` (file-agnostic) — you define `files`/`ignores`/`languageOptions`:

- `plugins: { '@stylistic': stylistic, 'import-x': importX, 'ai-rules': plugin }`
- `settings: { 'import-x/resolver-next': ... }` with `extensions: ['.ts','.tsx','.d.ts','.js','.jsx']`
- Rules (all `error` unless noted):

| Rule | Default | Notes |
|------|---------|-------|
| `ai-rules/filename-pascal-case` | `error` | File-agnostic: checks every file ESLint lints. See below |
| `ai-rules/project-structure` | `off` | Opt-in via `aiRules.configs.projects(...)` |
| `ai-rules/sort-imports` | `error` | Groups + length desc, collapses multiline |
| `ai-rules/no-multiline-imports` | `error` | Single-line imports |
| `import-x/no-duplicates` | `error` |  |
| `import-x/no-default-export` | `off` |  |
| `max-len` | `off` |  |
| `@stylistic/semi` | `['error','never']` | No semicolons |
| `@typescript-eslint/consistent-type-imports` | `['error',{prefer:'type-imports'}]` |  |
| `@typescript-eslint/no-unused-vars` | `['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]` |  |
| `@typescript-eslint/naming-convention` | `['error', {interface:'PascalCase' prefix I}, {typeAlias:'PascalCase' prefix T}]` | Disable per-project for `**/*.d.ts` via your own override if needed |

`recommended` has no `files`/`ignores` — add them in your `eslint.config.*` (see Quick Start). This repo's `eslint.config.mjs` adds `globalIgnores`, `files: ['**/*.{ts,tsx}']` with `extends: [js.configs.recommended, tseslint.configs.recommended]` + `globals.browser` locally.

### Custom setup (without `recommended`)

```ts
import { plugin } from 'eslint-plugin-ai-rules'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'ai-rules': plugin },
    rules: {
      'ai-rules/sort-imports': 'error',
      'ai-rules/no-multiline-imports': 'warn',
      'ai-rules/filename-pascal-case': 'off',
    },
  },
])
```

You can also import rules individually:

```ts
import { filenamePascalCase, sortImports, noMultilineImports } from 'eslint-plugin-ai-rules'
```

## Rules

Brief overview. See source in `src/rules/` for full logic.

### `ai-rules/project-structure`

Validates the folder hierarchy, folder names and file names against the structure configured in `settings['ai-rules']`.

- **Type:** `problem`, no autofix
- **Reads:** `settings['ai-rules'].project` or `settings['ai-rules'].projects`
- **Enabled by:** `aiRules.configs.projects(...)`
- **Ignores:** files outside the project root, `ignoredPaths`, and `ignore: true` subtrees
- **Messages:** `folderNotAllowed`, `folderNameMismatch`, `fileNotAllowed`, `fileNameMismatch`

```ts
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'ai-rules': plugin },
    settings: {
      'ai-rules': {
        project: {
          rootFolder: 'apps/api',
          structure: {
            files: ['index.ts'],
            folders: {
              src: {
                folders: {
                  '[module]': {
                    name: { case: 'kebab-case' },
                    files: [
                      {
                        case: 'PascalCase',
                        suffix: 'UseCase',
                        extensions: ['.ts'],
                      },
                    ],
                  },
                },
              },
            },
            ignoredPaths: ['dist/**'],
          },
        },
      },
    },
    rules: {
      'ai-rules/project-structure': 'error',
    },
  },
])
```

For monorepos without the factory, pass multiple projects and the rule picks the most specific root:

```ts
settings: {
  'ai-rules': {
    projects: [
      { rootFolder: 'apps/web', structure: frontendStructure },
      { rootFolder: 'apps/api', structure: backendStructure },
    ],
  },
}
```

### `ai-rules/filename-pascal-case`

Enforces `PascalCase` for file names. The rule is file-agnostic: it validates every file ESLint decides to lint, following the flat-config `files`/`ignores` defined in the consumer's config (same pattern as other filename rules).

- **Type:** `suggestion`, no autofix, `messageId: invalid`
- **Ignores:** `index.{ts,tsx,js,jsx}`, `*.d.ts`, `*.css`, dotfiles
- **Checks:** `path.basename` from `getPhysicalFilename()` / `context.filename`, `^[A-Z][a-zA-Z0-9]*$`, `kebab/snake -> PascalCase` conversion
- **Options:**
  - `ignore` — array of regex strings matched against the basename and the path relative to `cwd` (same idea as `unicorn/filename-case`). Use it for tool-mandated names like `*.config.*`, tests/specs, generated or vendored code.
  - `ignoreMiddleExtensions` — `boolean`, default `true`. When `true`, only the base name before the first dot is validated, so `ValidationRanges.test.ts` is valid and `my-component.test.ts` is renamed to `MyComponent.test.ts`. When `false`, every dot-separated segment must be PascalCase, so `ValidationRanges.test.ts` is renamed to `ValidationRanges.Test.ts` (same idea as `unicorn/filename-case`).

```ts
// my-component.ts         ❌  Rename to "MyComponent.ts"
// ValidationRanges.test.ts  ✅ (ignoreMiddleExtensions: true, default)
// ValidationRanges.test.ts  ❌  Rename to "ValidationRanges.Test.ts" (ignoreMiddleExtensions: false)
// MyComponent.ts          ✅
```

```ts
'ai-rules/filename-pascal-case': [
  'error',
  {
    ignore: ['\\.config\\.', '^generated/'],
    ignoreMiddleExtensions: false,
  },
]
```

To scope or disable it, use your own config (as this repo does in `eslint.config.mjs`):

```ts
import { defineConfig } from 'eslint/config'
import { recommended } from './src/configs/recommended'

export default defineConfig([
  ...recommended,
  { files: ['src/**/*'], rules: { 'ai-rules/filename-pascal-case': 'off' } },
])
```

### `ai-rules/no-multiline-imports`

Disallows multiline `ImportDeclaration`.

- **Type:** `layout`, `fixable: code`, `messageId: multilineImport`
- **Fix:** collapses `{`, `}`, `,` and whitespace to single line: `import { b, a } from 'lodash'`

```ts
// ❌
import {
  b,
  a
} from 'lodash'

// ✅ after --fix
import { b, a } from 'lodash'
```

Note: `ai-rules/sort-imports` also collapses multiline; both fixers may run, but `sort-imports` handles the full `Program` sort.

### `ai-rules/sort-imports`

Sorts imports by group and line-length descending, collapsing multiline imports.

- **Type:** `layout`, `fixable: code` (`Program` fixer), `messageId: sortRequired`
- **Groups (in order, each separated by one blank line):**
  1. Directives (`'use client'`, `'use server'`, `'use strict'`)
  2. External (`react` first, then other externals sorted by `line.length` desc → `localeCompare`)
  3. Internal (`.`, `@/` sorted same)
  4. Re-exports (`export { ... } from`, `export * from` sorted same)
- **Rest:** code after imports, joined with `\n\n\n` (two blank lines between imports and code)
- **Directives:** preserved at top while `canAcceptDirectives` is true

```ts
// ❌ before --fix
import { local } from './local'
import { a } from 'lodash'
import React from 'react'

// ✅ after --fix
import React from 'react'
import { a } from 'lodash'

import { local } from './local'
```

Supports side-effect `import 'polyfill'`, `import type`, `export * from`, `export { ... } from`.

## TypeScript

Plugin itself uses `module: ESNext` + `moduleResolution: bundler` (`tsconfig.json`) and **no `.js` extensions** in source imports (e.g., `from './plugin'`). Output is bundled to single `dist/index.js` via `tsup`, so consumers don't need to handle internal paths. For your project, any TS config works; the preset sets `languageOptions.globals: globals.browser` and `import-x/resolver-next`.

## Troubleshooting

**Missing `dist` before lint (repo uses `eslint.config.mjs` → `dist`)**
```
Error: Cannot find module './dist/index.js'
```
Fix: `npm run build` first. This repo's `eslint.config.mjs` imports from `dist` (no `jiti`), so `prelint` runs `build` automatically (`package.json` `prelint`).

**File ignored because outside of base path**
You passed an absolute path outside the config's `basePath`. Run `npx eslint .` from project root or use `npx eslint --no-config-lookup -c ./eslint.config.js ./src/file.ts` with correct cwd.

**Flat config only**
This plugin exports flat config arrays. It does not support legacy `.eslintrc`. Use `eslint.config.{js,ts}`.

**Filename rule too strict for tests/configs**
The rule checks every linted file. Test/spec files with a PascalCase base (e.g. `ValidationRanges.test.ts`) pass by default via `ignoreMiddleExtensions: true`. For tool-mandated names like `*.config.*`, generated or vendored code, pass the `ignore` option (`{ ignore: ['\\.config\\.', '^generated/'] }`) or disable `ai-rules/filename-pascal-case` for those files via an override (see Quick Start).

## Development

```bash
git clone <repo>
cd eslint-ai-guard
npm install

npm run typecheck  # tsc --noEmit
npm test           # node:test + dist build
npm run lint       # eslint .
npm run lint -- --fix
npm run build      # tsup -> dist/index.js + dist/index.cjs + dist/index.d.ts
npm run dev        # tsup --watch
npm run verify     # typecheck + test + lint + pack
npm run test:consumer # installs the packed tarball in a temp project and runs ESLint
npm run test:package  # publint + arethetypeswrong
npm run test:release  # consumer + package checks
npm pack --dry-run    # verify files: dist only
```

`test:consumer` and `test:package` are release checks and are not part of `verify`; they may use the network.

### Project structure

```
eslint-ai-guard/  # package: eslint-plugin-ai-rules
├── src/
│   ├── index.ts              # re-exports plugin + configs + types + presets
│   ├── plugin.ts             # plugin.meta + rules
│   ├── configs/
│   │   ├── recommended.ts    # flat-config preset (bundled rules)
│   │   ├── projects.ts       # project presets + custom structure factory
│   │   └── index.ts
│   ├── types/
│   │   └── structure.ts      # structure DSL types
│   ├── structures/
│   │   ├── mergeStructure.ts # preset + override merge
│   │   ├── validateStructure.ts
│   │   └── presets/
│   │       ├── frontend.ts
│   │       ├── backend.ts
│   │       ├── other.ts
│   │       └── index.ts
│   ├── utils/                # name/path/file matching helpers
│   └── rules/
│       ├── FilenamePascalCase.ts
│       ├── NoMultilineImports.ts
│       ├── ProjectStructure.ts
│       ├── SortImports.ts    # also exports getSortedContent
│       └── index.ts
├── test/                     # node:test suites (run against dist)
├── scripts/
│   └── TestConsumer.mjs      # tarball consumer smoke test
├── eslint/                   # deprecated original implementations
├── eslint.config.mjs         # dogfooding: aiRules.configs.projects from dist
├── tsconfig.json             # ESNext/bundler, no .js extensions
├── tsup.config.ts            # entry src/index.ts, format cjs+esm, dts, splitting:false
├── package.json              # type module, exports ., files [dist]
└── dist/                     # build output (gitignored)
```

### Adding a new rule

1. Create `src/rules/MyRule.ts` (`Rule.RuleModule`, `meta.messages`, `fixable` if needed)
2. Export it from `src/rules/index.ts`
3. Register in `src/plugin.ts` (`rules: { 'my-rule': myRule }`)
4. Enable in `src/configs/recommended.ts` (`'ai-rules/my-rule': 'error'`)
5. Add a `RuleTester` case in `test/` (add a fixture if needed)
6. `npm run verify`

### Publishing

```bash
npm run verify        # typecheck + test + lint + pack
npm run test:release  # consumer smoke + publint + arethetypeswrong
npm version patch|minor|major
npm publish --access public  # prepublishOnly runs verify (typecheck+test+lint+pack)
# or manually: npm run verify && npm publish --access public
```

## Legacy

`eslint/` keeps the three original rule files before packaging (deprecated). Source of truth is now `src/rules/`.

## License

MIT
