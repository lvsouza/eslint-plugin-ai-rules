# eslint-plugin-ai-rules

[![npm version](https://img.shields.io/npm/v/eslint-plugin-ai-rules)](https://www.npmjs.com/package/eslint-plugin-ai-rules)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![eslint 9.22+ / 10](https://img.shields.io/badge/eslint-%5E9.22%20%7C%7C%20%5E10-4B32C3)](https://eslint.org)

Flat-config-only ESLint plugin for AI-generated code. It catches filename/import drift and enforces a project structure you declare, with ready-to-use `frontend`, `nextjs` and `backend` presets.

> **ESLint 9.22+ or 10 only.** Uses flat config (`eslint.config.{js,mjs,ts}`). No legacy `.eslintrc` support.

## Start here

| If your project is... | Use |
|-----------------------|-----|
| Frontend only | `preset: 'frontend'` |
| Next.js App Router only | `preset: 'nextjs'` |
| Backend only | `preset: 'backend'` |
| Frontend + backend in one repo | two projects with different `rootFolder` |
| Neither frontend, nextjs nor backend | `preset: 'other'` |
| Layered architecture | `relations` (controller → useCase → repository) |

Before installing, check:

- Node.js `>= 20`
- ESLint `^9.22.0` or `^10.0.0`
- TypeScript `>= 5.0.0 < 6.1.0`
- `typescript-eslint` configured as parser
- `tsconfig.json` if you use aliases like `@/*`
- `eslint-import-resolver-typescript` installed for TS alias resolution

## Quick start

Install:

```bash
npm i -D eslint-plugin-ai-rules eslint typescript typescript-eslint eslint-import-resolver-typescript
```

Configure the project structure and let the plugin apply its recommended rules:

```ts
import { defineConfig } from 'eslint/config'
import aiRules from 'eslint-plugin-ai-rules'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    { rootFolder: '.', preset: 'frontend' },
  ]),
])
```

Monorepo with frontend and backend:

```ts
export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    { rootFolder: 'apps/web', preset: 'frontend' },
    { rootFolder: 'apps/api', preset: 'backend' },
  ]),
])
```

Project that is neither frontend, nextjs nor backend:

```ts
export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    { rootFolder: '.', preset: 'other' },
  ]),
])
```

Run:

```bash
npx eslint .
npx eslint --fix .
```

## Contents

- [Configuration warning](#configuration-warning)
- [Features](#features)
- [Requirements](#requirements)
- [Project structure](#project-structure)
- [Examples](#examples)
- [Architecture relations](#architecture-relations)
- [Expected diagnostics](#expected-diagnostics)
- [Preset reference](#preset-reference)
- [Structure DSL](#structure-dsl)
- [Limitations](#limitations)
- [Rules](#rules)
- [Disabling or changing rules](#disabling-or-changing-rules)
- [What runs automatically](#what-runs-automatically)
- [Recommended preset](#recommended-preset)
- [Troubleshooting](#troubleshooting)
- [Common mistakes](#common-mistakes)
- [Migrating from 0.4.x](#migrating-from-04x)
- [Migrating from 0.2.x](#migrating-from-02x)
- [Development](#development)
- [Publishing](#publishing)
- [Articles](#articles)
- [Contributing](#contributing)
- [Security](#security)
- [Credits](#credits)
- [License](#license)

## Configuration warning

If you install the plugin and use `aiRules.configs.recommended` without configuring the project structure, `ai-rules/project-setup` reports a warning the first time it lints a file:

```text
Project structure validation is not configured. Configure it with aiRules.configs.projects([{ rootFolder: ".", preset: "frontend" | "nextjs" | "backend" }]). If this project is not a frontend/nextjs/backend, use preset: "other" to disable this warning.  ai-rules/project-setup
```

The warning exists only to make sure the new structure rules are actually configured. It is reported once per process.

It disappears when you provide a valid configuration:

- `preset: 'frontend'`
- `preset: 'nextjs'`
- `preset: 'backend'`
- `preset: 'other'`
- a custom non-empty `structure`
- a `relations` configuration

A project containing only `rootFolder` and an empty `structure` is still considered unconfigured and will report.

For CI or temporary runs, silence the warning without changing the config:

```bash
AI_RULES_SILENT=1 npx eslint .
```

You can also disable the rule or change its severity like any other ESLint rule:

```ts
{
  rules: {
    'ai-rules/project-setup': 'off',
  },
}
```

The warning is still recommended as a setup check, so prefer `preset: 'other'` for projects that intentionally do not use structure validation.

## Features

- **Project structure validation** — folder hierarchy, dynamic folders, folder/file casing, prefixes, suffixes and regex patterns.
- **Frontend/Next.js/backend presets** — ready-to-use structures and architecture relations based on real projects.
- **Custom structure** — declare exactly how your project must be organized.
- **Architecture relations** — enforce which layers can import which other layers, including global vs page-local scope.
- **File-scoped preset overrides** — presets can disable rules only for framework files that require a different convention.
- **Monorepo friendly** — one `rootFolder` per project, including nested roots.
- **Autofix** — `sort-imports` and `no-multiline-imports` are fixable.
- **Named exports only** — `ai-rules/no-default-export` forbids default exports by default, with automatic exceptions for config files and Next.js framework files.
- **No parent imports** — `ai-rules/no-relative-parent-imports` keeps modules importing through aliases or packages instead of `../`.
- **Unresolved imports** — `ai-rules/no-unresolved` uses the TypeScript resolver to catch broken aliases and packages.
- **Bundled rules** — all rules from the bundled plugins are re-exported under the `ai-rules` namespace.
- **ESM + CJS** — `dist/index.js` and `dist/index.cjs`, with correct type declarations for both.

## Requirements

| Tool | Version |
|------|---------|
| Node.js | `>= 20` |
| ESLint | `^9.22.0 || ^10.0.0` |
| TypeScript | `>= 5.0.0 < 6.1.0` |
| ESLint resolver | `eslint-import-resolver-typescript` `^4.4.5` |

Runtime dependencies are `@stylistic/eslint-plugin`, `eslint-plugin-import-x`, `eslint-plugin-boundaries` and `typescript-eslint`.

`eslint-import-resolver-typescript` is a peer dependency used to resolve TS aliases for `relations` and `ai-rules/no-unresolved`. npm installs peers automatically; with Yarn 1 or pnpm, install it explicitly.

## Project structure

Each project definition has this shape:

```ts
interface IProjectRulesOverride {
  files: string[]
  rules: Linter.RulesRecord
}

interface IProjectDefinition {
  rootFolder: string
  preset?: 'frontend' | 'nextjs' | 'backend' | 'other'
  structure?: IProjectStructure
  relations?: IRelationsConfig
  rules?: Linter.RulesRecord
  overrides?: IProjectRulesOverride[]
  typeAware?: boolean
}
```

- `rootFolder` is the project root, usually the folder containing `package.json`.
- `rootFolder` is relative to the current working directory.
- Absolute paths inside the current working directory are also accepted.
- Nested roots are supported; the most specific root wins.
- Duplicate roots are rejected.
- `preset` provides a base structure.
- `structure` is merged on top of the preset.
- `relations` enables architecture dependency policies with `eslint-plugin-boundaries`.
- `rules` overrides rule severities and options for that project using the standard ESLint rule format.
- `overrides` applies rule changes only to the listed files, with `files` relative to `rootFolder`. Absolute paths and `..` segments are rejected.
- `typeAware` enables optional type-aware rules and configures `parserOptions.projectService`.
- `preset: 'other'` disables structure validation unless a custom `structure` is provided.

`aiRules.configs.projects([...])` generates configs for each project. A project normally produces one base config plus one config per file-scoped override:

- scopes `files` to the project root;
- sets `settings['ai-rules'].project`;
- enables `ai-rules/project-structure`;
- adds `ignores` from `ignoredPaths`;
- configures the TypeScript import resolver when `tsconfig.json`, `jsconfig.json` or `tsconfig.*.json` exists;
- includes the recommended rules, overridable by `rules`;
- disables `ai-rules/filename-pascal-case`, because file naming is handled by `project-structure`;
- when `relations` is present, enables `ai-rules/dependencies`;
- applies preset overrides, then project overrides, then project `rules` last, so a project can disable or change any rule.

## Examples

### Frontend only

```ts
import { defineConfig } from 'eslint/config'
import aiRules from 'eslint-plugin-ai-rules'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    { rootFolder: '.', preset: 'frontend' },
  ]),
])
```

### Next.js App Router only

```ts
import { defineConfig } from 'eslint/config'
import aiRules from 'eslint-plugin-ai-rules'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    { rootFolder: '.', preset: 'nextjs' },
  ]),
])
```

### Frontend and backend in the same repository

```ts
import { defineConfig } from 'eslint/config'
import aiRules from 'eslint-plugin-ai-rules'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    { rootFolder: 'packages/web', preset: 'frontend' },
    { rootFolder: 'packages/api', preset: 'backend' },
  ]),
])
```

### Backend with preset (copy-paste)

```ts
import { defineConfig } from 'eslint/config'
import aiRules from 'eslint-plugin-ai-rules'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    {
      rootFolder: '.',
      preset: 'backend',
    },
  ]),
])
```

The backend preset includes strict architecture relations. With this config:

```ts
// src/http/controllers/ListProducts.ts
import { listProducts } from '@/use-case/product/List' // allowed
import { productRepository } from '@/repositories/ProductRepository' // blocked
```

To override a preset relation, declare only the layer/rule you want to change:

```ts
relations: {
  rules: [
    { from: 'service', allow: ['generated', 'env'], allowSameLayer: false },
  ],
}
```

### Opting out with `other`

```ts
export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    { rootFolder: '.', preset: 'other' },
  ]),
])
```

### Custom structure

```ts
export default defineConfig([
  ...tseslint.configs.recommended,
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

### Use case with a suffix

```ts
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
}
```

### Controller with a suffix

```ts
structure: {
  folders: {
    src: {
      folders: {
        http: {
          folders: {
            controllers: {
              folders: {
                '[feature]': {
                  files: [
                    {
                      case: 'PascalCase',
                      suffix: 'Controller',
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
}
```

### Dynamic folder with prefix, suffix and regex

```ts
structure: {
  folders: {
    '[module]': {
      name: {
        prefix: 'feature-',
        suffix: '-module',
        pattern: '^feature-[a-z-]+-module$',
      },
      files: ['index.ts'],
    },
  },
}
```

Valid: `feature-users-module/index.ts`.

Invalid: `users-module/index.ts`, `feature-users/index.ts`, `feature-Users-module/index.ts`.

### Adding files to a preset

```ts
structure: {
  folders: {
    src: {
      additionalFiles: [
        { case: 'PascalCase', suffix: 'Service', extensions: ['.ts'] },
      ],
    },
  },
}
```

### Replacing preset files

```ts
structure: {
  folders: {
    src: {
      files: ['index.ts'],
    },
  },
}
```

### Ignoring a preset subtree

```ts
structure: {
  folders: {
    e2e: { ignore: true },
  },
}
```

### Ignoring paths globally

```ts
structure: {
  ignoredPaths: ['dist/**', 'coverage/**', 'src/shared/services/generated/**'],
}
```

### Manual settings without the factory

Advanced users can configure the rule directly:

```ts
import { plugin } from 'eslint-plugin-ai-rules'

export default [
  {
    files: ['src/**/*.ts'],
    plugins: { 'ai-rules': plugin },
    settings: {
      'ai-rules': {
        project: {
          rootFolder: '.',
          preset: 'other',
          structure: {
            folders: {
              src: {
                files: [{ case: 'PascalCase', extensions: ['.ts'] }],
              },
            },
          },
        },
      },
    },
    rules: {
      'ai-rules/project-structure': 'error',
    },
  },
]
```

Multiple projects can be passed directly through `settings['ai-rules'].projects`. The rule chooses the most specific root for each file.

## Architecture relations

`relations` enforces which layers can import which other layers. It complements `structure`: `structure` validates paths and names, `relations` validates import direction.

```ts
interface IRelationsRule {
  from: string
  allow?: string[]
  deny?: string[]
  allowSameLayer?: boolean
  allowTypeImports?: boolean
  message?: string
}

interface IRelationsScope {
  capture: string
  layers: string[]
}

interface IRelationsConfig {
  layers: Record<string, string | string[]>
  rules: IRelationsRule[]
  allowTypeImports?: boolean
  scope?: IRelationsScope
}
```

Example for a backend:

```ts
export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    {
      rootFolder: 'apps/backend',
      preset: 'other',
      relations: {
        layers: {
          controller: 'src/http/controllers',
          useCase: 'src/use-case',
          repository: 'src/repositories',
          service: 'src/services',
          helper: 'src/helpers',
        },
        rules: [
          { from: 'controller', allow: ['useCase', 'helper'] },
          { from: 'useCase', allow: ['repository', 'service', 'helper'] },
          { from: 'repository', allow: ['helper'] },
          { from: 'service', allow: ['repository', 'helper'] },
          { from: 'helper', allow: [] },
        ],
      },
    },
  ]),
])
```

Semantics:

- Layers are folder paths relative to `rootFolder`.
- `allow` means the layer can import only the listed layers.
- `deny` means the layer cannot import the listed layers.
- `allow` and `deny` are mutually exclusive per rule.
- `allowSameLayer` defaults to `true`. Set it to `false` to block imports within the same layer.
- External packages and Node core modules are allowed automatically.
- Local files that do not match any layer are ignored by default.
- Only one rule per `from` layer is allowed.
- `scope` allows comparing a captured value, such as the current page, to restrict local imports to the same page.

Presets already include relation rules. You only need to declare `relations` when you want to add or override layers and rules:

```ts
aiRules.configs.projects([
  {
    rootFolder: 'apps/backend',
    preset: 'backend',
    relations: {
      rules: [
        { from: 'service', allow: ['generated', 'env'], allowSameLayer: false },
      ],
    },
  },
])
```

The preset backend is strict: controllers only use use-cases plus infrastructure, use-cases cannot access database/helpers directly, repositories cannot import repositories, and services cannot import services. Structural exceptions exist for `generated` and `database/schema`. Service subfolders are generic modules with their own scope.

The preset frontend uses global layers plus page-local scope. Global layers cannot import page-local files. Page-local files can import global layers and files from the same page only. The nextjs preset reuses the frontend relations, adds the `src/app` structure, maps `src/app` as its own layer and extends the page-local layers to `src/shared/pages/*`. App routes can import any layer, but other layers cannot import app routes.

### Backend preset relations

| Layer | Can import | Same layer |
|-------|------------|------------|
| controller | useCase, http, generated, helper, env | no |
| http | useCase, helper, generated | no |
| useCase | repository, service, serviceModule, generated | yes |
| repository | database, databaseSchema | no |
| service | generated, env | no |
| generated | — | yes |
| serviceModule | generated, env | yes, within the same module |
| database | databaseSchema, env | no |
| databaseSchema | — | yes |
| helper | — | no |
| env | — | no |
| types | — | no |

`generated` and `databaseSchema` are structural exceptions because they contain internal files that import each other. Any `src/services/<service-kebab>/` folder is a generic service module: files inside the same module can import each other, different modules cannot.

The strict backend preset will report existing violations such as:

- use-cases importing `database` or `helpers`;
- services importing other services;
- repositories importing other repositories, including `Setup`.

These violations are intentional and should be fixed during migration.

### Frontend preset relations

All global frontend layers live under `src/shared` (for example `src/shared/components`). Page-local layers remain under `src/pages/*`. The nextjs preset also maps the same page-local layers under `src/shared/pages/*`.

| Layer | Can import | Same layer |
|-------|------------|------------|
| components | components only (external libraries are allowed) | yes |
| hooks | hooks, contexts, services, generated, utils, helpers, constants, env | yes |
| contexts | services, generated, utils, helpers, constants, env | no |
| services | generated, utils, helpers, constants, env | no |
| generated | — | yes |
| utils | helpers, constants, env | no |
| helpers | utils, constants, env | no |
| constants | — | no |
| env | — | no |
| page | globals + same-page locals | yes (same page) |
| pageComponent | globals + same-page locals (including page main) | yes |
| pageHook | hooks/contexts/services/generated/utils/helpers/constants/env + same-page local hooks/services/contexts/helpers | yes |
| pageService | services, generated, utils, helpers, constants, env + same-page pageHelper | no |
| pageContext | contexts, services, generated, utils, helpers, constants, env + same-page pageService/pageHelper | no |
| pageHelper | helpers, utils, constants, env | no |

Local layers can import global layers. Global layers cannot import page-local layers. `pageHook` cannot import `pageComponent`.

`src/shared/components` is the atomic component layer: it can import other components, but not any internal folder such as `services`, `hooks`, `contexts`, `utils`, `helpers`, `constants` or `env`. External libraries remain allowed for third-party integrated components.

`utils` and `helpers` can import each other. If this creates undesirable cycles, remove one direction.

### Same-layer and page scope

```ts
relations: {
  layers: {
    pageComponent: 'src/pages/*/components',
    pageHook: 'src/pages/*/hooks',
    page: 'src/pages/*',
  },
  scope: {
    capture: 'page',
    layers: ['pageComponent', 'pageHook', 'page'],
  },
  rules: [
    {
      from: 'pageComponent',
      allow: ['pageHook'],
      allowSameLayer: true,
    },
  ],
}
```

A file from `src/pages/orders` can import another file from `src/pages/orders`, but not from `src/pages/users`.

### Type-only imports

Type-only imports follow the same restrictions by default:

```ts
import type { TUser } from '@/repositories/UserRepository' // blocked
```

Allow them globally:

```ts
relations: {
  allowTypeImports: true,
  layers: { /* ... */ },
  rules: [/* ... */],
}
```

Or for a specific layer:

```ts
{
  from: 'controller',
  allow: ['useCase'],
  allowTypeImports: true,
}
```

### Deny rules and messages

```ts
relations: {
  layers: {
    controller: 'src/http/controllers',
    repository: 'src/repositories',
  },
  rules: [
    {
      from: 'controller',
      deny: ['repository'],
      message: 'Controllers must use use-cases instead of repositories.',
    },
  ],
}
```

### Aliases and TypeScript

When the project root has a `tsconfig.json`, `jsconfig.json` or `tsconfig.*.json`, the generated config uses `eslint-import-resolver-typescript`, so aliases such as `@/repositories/UserRepository` are resolved automatically.

Make sure the resolver is installed at the project level:

```bash
npm i -D eslint-import-resolver-typescript
```

For JS projects without a TypeScript or JavaScript config file, the Node resolver is used.

`relations` uses `eslint-plugin-boundaries` under the hood and enables `ai-rules/dependencies`.

## Expected diagnostics

Configuration warning:

```text
[eslint-plugin-ai-rules] Project structure validation is not configured.
Configure it with aiRules.configs.projects([{ rootFolder: '.', preset: 'frontend' | 'nextjs' | 'backend' }]).
If this project is not a frontend/nextjs/backend, use preset: 'other' to disable this warning.
```

Structure violation:

```text
src/pages/MyFeature/Dashboard.tsx
  error  Folder "MyFeature" inside "src/pages" must match kebab-case.  ai-rules/project-structure
```

Relation violation:

```text
src/http/controllers/ListProducts.ts
  error  Dependencies to elements of type "repository" are not allowed in elements of type "controller".  ai-rules/dependencies
```

Custom relation message:

```ts
{
  from: 'controller',
  deny: ['repository'],
  message: 'Controllers must use use-cases instead of repositories.',
}
```

## Preset reference

### Frontend

```text
<root>/
├── root files: package.json, lockfiles, *.config.{js,mjs,cjs,ts},
│   tsconfig*.json, .env*, Dockerfile, entrypoint.sh, nginx.conf,
│   index.html, AGENTS.md, README.md, LICENSE
├── src/
│   ├── App.tsx, AppRoutes.tsx, main.tsx, index.css, vite-env.d.ts
│   ├── shared/
│   │   ├── assets/
│   │   │   ├── index.ts
│   │   │   ├── *.png, *.jpg, *.svg, *.webp, *.woff2, *.mp4, ...
│   │   │   └── <asset-group-kebab>/
│   │   │       ├── index.ts
│   │   │       └── *.png, *.jpg, *.svg, *.webp, *.woff2, *.mp4, ...
│   │   ├── components/
│   │   │   ├── *.tsx
│   │   │   └── ui/*.{ts,tsx}
│   │   ├── constants/*.ts
│   │   ├── contexts/*.tsx
│   │   ├── env/index.ts
│   │   ├── helpers/*.ts
│   │   ├── hooks/*.ts
│   │   ├── services/
│   │   │   ├── generated/** (ignored)
│   │   │   └── utils/*.ts
│   │   └── utils/*.ts
│   └── pages/
│       ├── *.tsx
│       └── <feature-kebab>/
│           ├── *.tsx, helpers.ts, schema.ts, types.ts
│           ├── components/*.tsx
│           ├── hooks/*.ts
│           ├── services/*.ts
│           ├── contexts/*.tsx
│           ├── helpers/*.ts
│           └── tabs/<tab-kebab>/
│               ├── *.tsx
│               └── <section-kebab>/
│                   ├── *.tsx, *.ts
│                   ├── components/*.tsx
│                   └── contents/
│                       ├── *.tsx
│                       └── components/*.tsx
├── e2e/
│   ├── .auth/** (ignored)
│   ├── fixtures/*
│   ├── pages/*.ts
│   ├── specs/*.spec.ts
│   └── support/*.ts
│       └── api/*.ts
├── scripts/*.ts
├── scripts/types/** (ignored)
├── public/** (ignored)
├── .storybook/**, .turbo/**, .vercel/**, storybook-static/** (ignored)
└── .github/**, .vscode/** (ignored)
```

### Next.js

The `nextjs` preset is the frontend preset plus the Next.js App Router under `src/app`. The root `app/` layout is not accepted.

```text
<root>/
├── same root files and folders as the frontend preset
├── next-env.d.ts, .next/**, out/** (ignored)
├── src/
│   ├── middleware.ts, proxy.ts, instrumentation.ts, instrumentation-client.ts
│   ├── app/
│   │   ├── layout.tsx, page.tsx, loading.tsx, error.tsx, global-error.tsx,
│   │   │   global-not-found.tsx, not-found.tsx, template.tsx, default.tsx,
│   │   │   forbidden.tsx, unauthorized.tsx, route.ts
│   │   ├── sitemap.ts, robots.ts, manifest.ts, providers.tsx, globals.css
│   │   ├── opengraph-image.{tsx,jpg,jpeg,png,gif}
│   │   ├── twitter-image.{tsx,jpg,jpeg,png,gif}
│   │   ├── icon.{tsx,ico,jpg,jpeg,png,svg}
│   │   ├── apple-icon.{tsx,jpg,jpeg,png}
│   │   ├── favicon.ico
│   │   └── <route-segment>/**
│   │       ├── same App Router files as src/app
│   │       └── <nested-route-segment>/**
│   ├── shared/, pages/ (same as the frontend preset)
│   └── shared/pages/
│       └── <page-kebab>/
│           ├── *.tsx, helpers.ts, schema.ts, types.ts
│           ├── components/*.tsx
│           ├── hooks/*.ts
│           ├── services/*.ts
│           ├── contexts/*.tsx
│           └── helpers/*.ts
├── e2e/, scripts/, public/, .github/, .vscode/ (same as the frontend preset)
```

`<route-segment>` must be kebab-case and may use Next.js conventions: route groups such as `(marketing)`, dynamic segments such as `[slug]`, catch-all segments such as `[...slug]` and `[[...slug]]`, parallel routes such as `@modal`, and intercepting routes such as `(.)photo`, `(..)photo` and `(...)photo`. Private folders such as `_components` are not accepted. Route folders are validated recursively; deeper levels beyond the configured depth are ignored instead of reported.

`src/shared/pages/<page-kebab>/` mirrors the frontend page-local resources so Next.js pages can keep page-exclusive components, hooks, services, contexts and helpers out of `src/app`. Files directly under `src/shared/pages/` are not allowed; the page folder must match kebab-case.

The `nextjs` preset automatically disables `ai-rules/no-default-export` for framework files that require default exports (`page.tsx`, `layout.tsx`, error files, metadata files, `middleware.ts` and `proxy.ts`). The `src/app` layer is also added to relations, so shared and page-local code cannot import app routes. `ai-rules/app-page-scope` additionally prevents an app route from importing another page under `src/shared/pages/*`.

### Backend

```text
<root>/
├── root files: package.json, lockfiles, *.config.{js,mjs,cjs,ts},
│   tsconfig*.json, .env*, Dockerfile, .dockerignore,
│   AGENTS.md, README.md, LICENSE
├── src/
│   ├── index.ts, Server.ts, Schemas.ts
│   ├── env/index.ts
│   ├── helpers/*.ts
│   ├── @types/*.d.ts
│   ├── database/
│   │   ├── Connection.ts
│   │   ├── schema/index.ts, *.ts
│   │   ├── seeds/index.ts
│   │   └── migrations/** (ignored)
│   ├── repositories/Setup.ts, *.ts
│   ├── http/
│   │   ├── Routes.ts
│   │   ├── controllers/Health.ts
│   │   ├── controllers/<feature-kebab>/
│   │   │   ├── *.ts
│   │   │   └── <resource-kebab>/*.ts
│   │   ├── hooks/*.ts
│   │   └── types/*.d.ts
│   ├── services/*.ts
│   ├── services/<service-kebab>/index.ts, *.ts
│   ├── services/generated/** (ignored)
│   └── use-case/
│       ├── Errors.ts
│       └── <feature-kebab>/
│           ├── *.ts
│           └── <resource-kebab>/*.ts
├── test/*.test.ts, GlobalSetup.ts, Setup.ts, ProvidedContext.d.ts
├── test/Helpers/*.ts
├── docs/** (ignored)
├── scripts/*.ts
├── uploads/** (ignored)
└── .github/**, .vscode/** (ignored)
```

### Other

`preset: 'other'` has an empty structure. It disables validation and suppresses the configuration warning. If you provide a `structure`, it validates exactly what you declared.

## Structure DSL

```ts
type TProjectPreset = 'frontend' | 'nextjs' | 'backend' | 'other'

type TNameCase = 'PascalCase' | 'camelCase' | 'kebab-case' | 'snake_case'

interface INameRule {
  case?: TNameCase
  prefix?: string
  suffix?: string
  pattern?: string
}

type TFileRule =
  | string
  | ({ extensions: string[] } & INameRule)

interface IStructureNode {
  name?: INameRule
  files?: TFileRule[]
  additionalFiles?: TFileRule[]
  folders?: Record<string, IStructureNode>
  ignore?: boolean
}

interface IProjectStructure extends IStructureNode {
  ignoredPaths?: string[]
}
```

### Folder keys

Literal keys match exactly:

```ts
folders: {
  components: { files: ['*.tsx'] },
}
```

Dynamic keys use brackets:

```ts
folders: {
  '[feature]': {
    name: { case: 'kebab-case' },
    files: ['*.tsx'],
  },
}
```

- Only one dynamic folder is allowed per level.
- `name` applies to dynamic folders.
- A static folder key cannot have a `name` rule.
- A dynamic folder without `name` accepts any folder name.

### File rules

Strings match exact names or globs:

```ts
files: [
  'index.ts',
  '*.spec.ts',
  '*.config.{js,mjs,cjs,ts}',
]
```

Supported glob syntax: `*`, `**`, `?` and `{a,b}`.

Object rules require `extensions` and validate the base name:

```ts
files: [
  {
    extensions: ['.ts', '.tsx'],
    case: 'PascalCase',
  },
  {
    extensions: ['.ts'],
    case: 'PascalCase',
    suffix: 'UseCase',
  },
  {
    extensions: ['.ts'],
    case: 'PascalCase',
    prefix: 'Use',
  },
  {
    extensions: ['.ts'],
    pattern: '^(Create|Read|Update|Delete|List)[A-Z][A-Za-z0-9]*$',
  },
]
```

- `extensions` also supports compound extensions: `.d.ts`, `.test.mjs`, `.spec.ts`.
- `case`, `prefix`, `suffix` and `pattern` apply to the base name after removing the extension.
- A file is valid when it matches at least one rule completely.

### Merge behavior

| Field | Behavior |
|-------|----------|
| `folders` | recursive merge by key; new keys are added |
| `files` | replaces the preset files at that node |
| `additionalFiles` | appends to the preset files |
| `name` | fields override the preset |
| `ignore` | overrides the preset |
| `ignoredPaths` | union of preset and custom paths |

The merged structure is validated again after the merge, so a custom structure cannot create an invalid result such as two dynamic folders at the same level. Unsupported DSL properties are rejected instead of being silently ignored.

### Rule overrides

`overrides` applies rules only to the declared files:

```ts
aiRules.configs.projects([
  {
    rootFolder: '.',
    preset: 'nextjs',
    overrides: [
      {
        files: ['src/app/**/page.tsx'],
        rules: {
          'ai-rules/no-default-export': 'off',
        },
      },
    ],
  },
])
```

Precedence for override configs is: preset override rules, then project override rules, then project `rules`. Any flat config placed after `projects()` still wins.

Negated patterns are supported and remain relative to `rootFolder`:

```ts
files: ['src/**/*.ts', '!src/generated/**']
```

### Type-aware rules

Set `typeAware: true` to enable type-aware rules:

```ts
aiRules.configs.projects([
  {
    rootFolder: 'apps/web',
    preset: 'nextjs',
    typeAware: true,
  },
])
```

This configures `languageOptions.parserOptions.projectService` and `tsconfigRootDir`, and enables `ai-rules/no-floating-promises`, `ai-rules/no-misused-promises` and `ai-rules/await-thenable`. The project must have a `tsconfig.json`, `jsconfig.json` or `tsconfig.*.json`, and type-aware linting has a higher cost.

## Limitations

- Structure validation only runs for files ESLint actually lints.
- Required empty folders are not detected.
- Glob matching supports `*`, `**`, `?` and `{a,b}` only.
- Nested roots are supported, but duplicate roots are rejected.
- Relation layers must point to folders, not individual files.
- Scoped layers must use patterns with a wildcard, such as `src/pages/*`.
- TypeScript aliases in `relations` and `no-unresolved` require a project `tsconfig.json`, `jsconfig.json` or `tsconfig.*.json`.
- `ai-rules/no-unresolved` ignores style, image, font and media imports because those files are not resolved as JavaScript modules.
- Type-only imports follow the same restrictions by default.
- The backend preset is strict and will flag existing imports that violate AGENTS.md.
- The frontend preset allows `utils` and `helpers` to import each other, which can create cycles.
- ESLint versions below 9.22 are not supported.

## Rules

### `ai-rules/project-structure`

Validates the configured hierarchy, folder names and file names.

- Type: `problem`
- No autofix
- Reads `settings['ai-rules'].project` or `settings['ai-rules'].projects`
- Messages: `folderNotAllowed`, `folderNameMismatch`, `fileNotAllowed`, `fileNameMismatch`
- Ignores files outside the project root, `ignoredPaths` and `ignore: true` subtrees

### `ai-rules/app-page-scope`

Restricts imports from a Next.js app route to page resources in the same shared page.

- Type: `problem`
- Enabled as `error` in the `nextjs` preset
- Reads `settings['ai-rules'].project`
- Resolves imports through the configured `import-x` resolver
- Message: `crossPage`

Allowed:

```ts
// src/app/orders/page.tsx
import { OrderCard } from '@/shared/pages/orders/components/OrderCard'
```

Blocked:

```ts
// src/app/orders/page.tsx
import { UserCard } from '@/shared/pages/users/components/UserCard'
```

Route groups, dynamic segments, parallel routes and intercepting routes are ignored when deriving the app page name. Root `src/app` files without a page segment are not restricted.

### `ai-rules/project-setup`

Reports the configuration warning described above as a regular ESLint diagnostic.

- Type: `suggestion`
- Enabled as `warn` in `recommended`
- Reports once per process
- Respects the configured severity (`off`, `warn`, `error`)
- Suppressed by `preset: 'other'`, `frontend`, `nextjs`, `backend` or a non-empty custom structure

### `ai-rules/filename-pascal-case`

Enforces PascalCase for file names.

- Ignores `index.{ts,tsx,js,jsx}`, `*.d.ts`, `*.css` and dotfiles.
- Options:
  - `ignore`: regex strings matched against the basename and relative path.
  - `ignoreMiddleExtensions`: defaults to `true`, so `ValidationRanges.test.ts` is valid.

```ts
'ai-rules/filename-pascal-case': [
  'error',
  {
    ignore: ['\\.config\\.', '^generated/'],
    ignoreMiddleExtensions: false,
  },
]
```

`projects()` disables this rule because `project-structure` enforces file names.

### `ai-rules/no-multiline-imports`

Disallows multiline import declarations. Fixable.

```ts
// before
import {
  b,
  a,
} from 'lodash'

// after --fix
import { b, a } from 'lodash'
```

### `ai-rules/sort-imports`

Sorts imports by group and line length descending, collapsing multiline imports. Fixable.

Groups:

1. Directives (`'use client'`, `'use server'`, `'use strict'`)
2. External packages (`react` first, then by line length desc)
3. Internal imports (`.`, `@/`)
4. Re-exports

## Bundled rules from other plugins

All rules from `import-x`, `@stylistic`, `@typescript-eslint` and `boundaries` are re-exported under the `ai-rules` namespace. `recommended` registers only the `ai-rules` plugin and applies these aliases:

| Rule | Default | Purpose |
|------|---------|---------|
| `ai-rules/no-duplicates` | `error` | Prevent importing the same module twice |
| `ai-rules/no-default-export` | `error` | Forbid default exports, except config files and Next.js framework files |
| `ai-rules/no-relative-parent-imports` | `error` | Forbid relative imports from parent directories |
| `ai-rules/no-explicit-any` | `error` | Forbid explicit `any` |
| `ai-rules/no-non-null-assertion` | `error` | Forbid non-null assertions |
| `ai-rules/no-self-import` | `error` | Forbid a module importing itself |
| `ai-rules/no-unresolved` | `error` | Report imports that cannot be resolved |
| `ai-rules/no-useless-path-segments` | `error` | Remove useless path segments |
| `ai-rules/no-extraneous-dependencies` | `warn` | Report packages missing from dependencies |
| `ai-rules/no-cycle` | `warn` | Report circular imports up to depth 5 |
| `no-debugger` | `error` | Forbid `debugger` statements |
| `no-console` | `warn` | Allow `info`, `warn` and `error` only |
| `max-len` | `off` | No line length limit |
| `ai-rules/semi` | `['error', 'never']` | No semicolons |
| `ai-rules/consistent-type-imports` | `['error', { prefer: 'type-imports' }]` | Prefer `import type` |
| `ai-rules/no-unused-vars` | `['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]` | Ignore unused values prefixed with `_` |
| `ai-rules/naming-convention` | interfaces `I` prefix, type aliases `T` prefix | Enforce `IUser` and `TUser` style |

The alias is the original rule name, unless two plugins expose the same name. In that case the source is used as prefix:
- `ai-rules/import-x-no-namespace` and `ai-rules/typescript-eslint-no-namespace`
- `ai-rules/import-x-no-deprecated` and `ai-rules/typescript-eslint-no-deprecated`

`ai-rules/no-relative-parent-imports` only checks specifiers that start with `.`, so aliases such as `@/` remain valid even when the TypeScript resolver is active. `ai-rules/no-unresolved` ignores style, image, font and media imports, as well as Vite query imports such as `?raw`, `?url`, `?worker` and `?inline`.

The original rule options, messages and docs are preserved. Settings still use the upstream names (`import-x/*`, `boundaries/*`, `import/resolver`) because the original rule implementations read those keys.

`ai-rules/no-default-export` reports both `export default` and `export { value as default }`. The presets automatically disable it for `*.config.{js,mjs,cjs,ts}` and, in the `nextjs` preset, for files that require default exports (`page.tsx`, `layout.tsx`, error files, metadata files, `middleware.ts` and `proxy.ts`). For custom projects or additional framework files, declare an override:

```ts
{
  files: ['src/pages/**/*'],
  rules: {
    'ai-rules/no-default-export': 'off',
  },
}
```

When `relations` is configured, `projects()` enables `ai-rules/dependencies` with the generated layer policies. The rule is backed by `eslint-plugin-boundaries`, and its settings remain under `boundaries/*`.

The plugin configures `import-x/resolver-next` with the TypeScript resolver when a `tsconfig.json`, `jsconfig.json` or `tsconfig.*.json` is available, followed by the node resolver:

```ts
extensions: ['.ts', '.tsx', '.d.ts', '.js', '.jsx', '.mjs', '.cjs']
```

`ai-rules/no-unresolved` ignores style, image, font and media imports, plus Vite query imports such as `?raw`, `?url`, `?worker` and `?inline`.

## Disabling or changing rules

Every rule is controlled through the standard ESLint `rules` object. Any entry accepts `'off'`, `'warn'`, `'error'`, or `['error', options]`.

### Option 1: override after the generated config

Flat config is evaluated in order, so a config placed after `projects()` or `recommended` wins:

```ts
export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    { rootFolder: '.', preset: 'frontend' },
  ]),
  {
    rules: {
      'ai-rules/sort-imports': 'off',
      'ai-rules/project-structure': 'warn',
      'ai-rules/filename-pascal-case': 'error',
      'ai-rules/semi': ['warn', 'always'],
      'ai-rules/no-default-export': 'off',
      'ai-rules/no-relative-parent-imports': 'off',
      'ai-rules/dependencies': 'off',
    },
  },
])
```

To apply an override only to part of the repository, use `files`:

```ts
{
  files: ['scripts/**/*', '*.config.*'],
  rules: {
    'ai-rules/filename-pascal-case': 'off',
  },
}
```

### Option 2: per-project `rules`

When using `projects()`, pass `rules` in the project definition. These rules are applied after the recommended rules, the preset rules and the automatic structure/relations rules:

```ts
aiRules.configs.projects([
  {
    rootFolder: 'apps/api',
    preset: 'backend',
    rules: {
      'ai-rules/sort-imports': 'off',
      'ai-rules/project-structure': 'warn',
      'ai-rules/semi': ['warn', 'always'],
      'ai-rules/dependencies': 'off',
    },
  },
])
```

### Option 3: per-project `overrides`

Use `overrides` to change rules only for specific files inside a project:

```ts
aiRules.configs.projects([
  {
    rootFolder: 'apps/web',
    preset: 'nextjs',
    overrides: [
      {
        files: ['src/shared/pages/**/*.tsx'],
        rules: {
          'ai-rules/no-default-export': 'off',
        },
      },
    ],
  },
])
```

`files` are relative to `rootFolder` and receive the same project prefix as the base config.

Precedence inside `projects()` is:

1. `recommended` rules
2. automatic `project-structure`, `filename-pascal-case` and `dependencies` rules
3. `preset.rules`
4. preset and project `overrides` for the matching files
5. project `rules`
6. any flat config placed after `projects()` in the ESLint config array

The `rules` option uses the same shape as ESLint, including options arrays:

```ts
rules: {
  'ai-rules/filename-pascal-case': [
    'error',
    { ignore: ['\\.config\\.'], ignoreMiddleExtensions: false },
  ],
}
```

## What runs automatically

| You use | What is enabled |
|---------|-----------------|
| `aiRules.configs.recommended` | bundled rules + configuration warning |
| `aiRules.configs.projects([...])` | recommended rules + `project-structure` + TypeScript resolver |
| `projects([...])` with `preset: 'frontend' \| 'nextjs' \| 'backend'` | preset structure + preset relations + preset overrides |
| `projects([...])` with `structure` | structure validation |
| `projects([...])` with `relations` | `ai-rules/dependencies` |
| `projects([...])` with `overrides` | file-scoped rule overrides |
| `projects([...])` with `typeAware: true` | type-aware rules + `parserOptions.projectService` |
| `projects([...])` with both | structure + relations |

`projects()` does **not** configure the TypeScript parser. Pair it with `typescript-eslint` as shown in the examples. `typeAware` only adds parser options; the parser still comes from your TypeScript ESLint config.

## Recommended preset

`aiRules.configs.recommended` is file-agnostic. It provides:

- plugins: `ai-rules`
- `settings['import-x/resolver-next']`
- the rule set documented above

It does **not** configure:

- `files`
- `ignores`
- parser
- language options
- globals

Pair it with `typescript-eslint` or `@typescript-eslint/parser` and define `files` in your config. `aiRules.configs.projects([...])` already does the file scoping for you.

If you want the recommended rules without project structure validation, use `projects([{ rootFolder: '.', preset: 'other' }])`.

## Troubleshooting

### The configuration warning keeps appearing

Use a valid project configuration:

```ts
...aiRules.configs.projects([
  { rootFolder: '.', preset: 'frontend' },
])
```

Or explicitly opt out:

```ts
...aiRules.configs.projects([
  { rootFolder: '.', preset: 'other' },
])
```

A project with only `rootFolder` and an empty `structure` still warns.

If you intentionally do not want this check, disable the rule:

```ts
{
  rules: {
    'ai-rules/project-setup': 'off',
  },
}
```

For temporary runs or CI, use:

```bash
AI_RULES_SILENT=1 npx eslint .
```

### `project-structure` is not running

Make sure you are using `aiRules.configs.projects([...])` or manually setting `settings['ai-rules'].project` and enabling `ai-rules/project-structure`.

### Type-aware rule error

`ai-rules/consistent-type-imports` needs the TypeScript parser. Pair the plugin with:

```ts
...tseslint.configs.recommended
```

### Missing `dist` before lint

This repository imports the local build from `dist`. Consumers should import the published package:

```ts
import aiRules from 'eslint-plugin-ai-rules'
```

### File ignored because outside of base path

Run ESLint from the project root, or configure the correct `basePath`.

### Flat config only

This plugin exports flat config arrays. It does not support legacy `.eslintrc`.

### Default export is reported

`ai-rules/no-default-export` is enabled as `error` in `recommended`. Prefer named exports, or opt out for files that require a default export:

```ts
{
  files: ['*.config.*', 'src/pages/**/*'],
  rules: {
    'ai-rules/no-default-export': 'off',
  },
}
```

### Relative parent imports are reported

`ai-rules/no-relative-parent-imports` is enabled as `error` in `recommended`. Prefer aliases such as `@/helpers/x` or a package, or opt out when your project intentionally uses `../`:

```ts
{
  files: ['scripts/**/*'],
  rules: {
    'ai-rules/no-relative-parent-imports': 'off',
  },
}
```

### Filename rule too strict

Use the `ignore` option or disable `ai-rules/filename-pascal-case` for tool-mandated files:

```ts
{
  files: ['*.config.*', 'scripts/**/*'],
  rules: {
    'ai-rules/filename-pascal-case': 'off',
  },
}
```

## Common mistakes

### Using `recommended` without `projects()`

You get the configuration warning and no project structure validation. Use `projects([...])` or explicitly opt out with `preset: 'other'`.

### Forgetting the TypeScript parser

`aiRules.configs.recommended` does not configure `languageOptions.parser`. Pair it with `tseslint.configs.recommended` or a parser.

### Aliases are not enforced in relations

Make sure the project has a `tsconfig.json`/`jsconfig.json` with `paths`, and install `eslint-import-resolver-typescript`.

### A relation layer does not match

Layers must point to folders, not files:

```ts
layers: {
  controller: 'src/http/controllers', // correct
  // controller: 'src/http/controllers/*.ts', // avoid
}
```

### Type-only imports are blocked

That is the default. Set `allowTypeImports: true` globally or per rule.

### An external package or unknown file is not blocked

`relations` only checks known local layers. External packages, Node core modules, same-layer imports and files outside any layer are allowed.

### Duplicate or overlapping roots

Nested roots are supported, but duplicate roots are rejected. Use the most specific configuration for each project.

## Migrating from 0.4.x

Bundled rules moved from their upstream namespaces to `ai-rules`. Replace the old IDs in `rules` overrides:

| Before | After |
|--------|-------|
| `import-x/no-duplicates` | `ai-rules/no-duplicates` |
| `import-x/no-default-export` | `ai-rules/no-default-export` |
| `import-x/no-relative-parent-imports` | `ai-rules/no-relative-parent-imports` |
| `@stylistic/semi` | `ai-rules/semi` |
| `@typescript-eslint/consistent-type-imports` | `ai-rules/consistent-type-imports` |
| `@typescript-eslint/no-unused-vars` | `ai-rules/no-unused-vars` |
| `@typescript-eslint/naming-convention` | `ai-rules/naming-convention` |
| `boundaries/dependencies` | `ai-rules/dependencies` |

For any other bundled rule, drop the plugin prefix and use `ai-rules/<rule-name>`. The only exceptions are `no-namespace` and `no-deprecated`, which exist in both `import-x` and `@typescript-eslint`; use `ai-rules/import-x-<rule-name>` or `ai-rules/typescript-eslint-<rule-name>`.

If you use settings directly, keep the upstream keys (`import-x/*` and `boundaries/*`).

## Migrating from 0.2.x

1. Replace `aiRules.configs.recommended` with `aiRules.configs.projects([...])`.
2. Choose a preset: `frontend`, `nextjs`, `backend`, or `other`.
3. Set `rootFolder` to the folder containing `package.json`.
4. Add `relations` if you want layer boundaries.
5. Keep pairing with `typescript-eslint`.

If you intentionally do not want structure validation:

```ts
...aiRules.configs.projects([
  { rootFolder: '.', preset: 'other' },
])
```

## Development

```bash
git clone https://github.com/lvsouza/eslint-ai-guard.git
cd eslint-ai-guard
corepack enable
yarn install --frozen-lockfile

yarn typecheck      # tsc --noEmit
yarn test           # node:test against dist
yarn test:watch     # node:test in watch mode
yarn lint           # eslint .
yarn lint --fix
yarn build          # tsup -> ESM + CJS + declarations
yarn dev            # tsup --watch
yarn verify         # typecheck + test + lint + pack
yarn test:coverage  # c8 coverage with thresholds
yarn test:consumer  # install packed tarball in a temp project
yarn test:package   # publint + arethetypeswrong
yarn test:release   # full validation before release
npm pack --dry-run  # verify published files
```

`test:consumer` and `test:package` are release checks and are not part of `verify`. They may use the network. `test:release` runs the complete validation: `verify`, coverage, consumer and package checks.

The consumer smoke test covers structure validation, relations with aliases and type-only imports, warning/suppression, ESM and CJS. It accepts `ESLINT_VERSION`:

```bash
ESLINT_VERSION=9.22.0 yarn test:consumer
ESLINT_VERSION='^10.0.0' yarn test:consumer
```

The publish workflow (`.github/workflows/publish.yml`) runs on every push to `main`. When `package.json` has a version different from the latest npm release, it runs lint, typecheck, tests and build before publishing. After a successful publish, it creates and pushes the matching `v<version>` tag and creates the corresponding GitHub Release with generated notes.

### Project structure

```text
eslint-ai-guard/
├── src/
│   ├── index.ts
│   ├── plugin.ts
│   ├── configs/
│   │   ├── recommended.ts
│   │   ├── projects.ts
│   │   └── index.ts
│   ├── types/
│   │   └── structure.ts
│   ├── structures/
│   │   ├── buildRelationsConfig.ts
│   │   ├── hasStructureRules.ts
│   │   ├── mergeRelations.ts
│   │   ├── mergeStructure.ts
│   │   ├── validateRelations.ts
│   │   ├── validateStructure.ts
│   │   └── presets/
│   ├── utils/
│   └── rules/
│       ├── constants.ts
│       ├── FilenamePascalCase.ts
│       ├── NoMultilineImports.ts
│       ├── ProjectSetup.ts
│       ├── ProjectStructure.ts
│       ├── SortImports.ts
│       └── index.ts
├── test/
├── scripts/
│   └── TestConsumer.mjs
├── docs/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── publish.yml
│   ├── ISSUE_TEMPLATE/
│   └── dependabot.yml
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── eslint.config.mjs
├── tsconfig.json
├── tsup.config.ts
├── package.json
└── dist/
```

### Adding a new rule

1. Create `src/rules/MyRule.ts` in PascalCase.
2. Add the rule name to `src/rules/constants.ts`.
3. Export it from `src/rules/index.ts`.
4. Register it in `src/plugin.ts`.
5. Add it to `src/configs/recommended.ts` if it should be enabled by default.
6. Provide `meta.docs.description`, `meta.docs.url`, `meta.docs.recommended`, `meta.schema` and `meta.messages`.
7. Add `meta.defaultOptions` when the rule accepts options.
8. Add tests in `test/`.
9. Run `yarn verify`.

## Publishing

Releases are manual in the sense that you choose the version, but publication, tagging and GitHub Releases are automated by `.github/workflows/publish.yml`.

1. Update `version` in `package.json`.
2. Update `CHANGELOG.md`.
3. Run `yarn test:release`.
4. Commit and push the changes to `main`.

On push to `main`, the workflow compares the `package.json` version with the latest npm release. If the version changed, it runs lint, typecheck, tests and build, publishes to npm, then creates and pushes the matching `v<version>` tag and creates the GitHub Release with generated notes automatically.

The workflow requires the `NPM_TOKEN` repository secret for npm. The tag and release jobs use the default `GITHUB_TOKEN` with `contents: write`.

If the version was already published but the tag or release is missing, pushing to `main` again will create the missing item without republishing. Both jobs are idempotent and skip when the tag or release already exists.

`prepack` runs `yarn build` automatically, so published packages always contain a fresh `dist`. The plugin version is injected from `package.json` during the build, so you do not need to edit `src/plugin.ts`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, testing and rule-authoring guidelines. All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](SECURITY.md) for supported versions and private vulnerability reporting.

## Articles

- [How I forced AI to follow the project standard with ESLint](docs/tabnews-eslint-plugin-ai-rules.md)

## Credits

Third-party libraries and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

MIT
