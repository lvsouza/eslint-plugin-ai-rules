# Contributing

Thanks for taking the time to contribute to `eslint-plugin-ai-rules`.

## Requirements

- Node.js `>= 20`
- Yarn `1.22.x`
- Git

The repository uses Yarn 1. If you use Corepack:

```bash
corepack enable
yarn install --frozen-lockfile
```

## Development commands

```bash
yarn install --frozen-lockfile
yarn typecheck
yarn test
yarn lint
yarn test:coverage
yarn test:consumer
yarn test:package
yarn verify
```

`yarn verify` runs type checking, tests, linting and a package dry-run. Consumer and package checks may use the network.

## Project layout

- `src/rules/` contains the ESLint rules.
- `src/configs/` contains the flat config factories.
- `src/structures/` contains structure parsing, merging and validation.
- `src/types/` contains the public types.
- `test/` contains unit, integration and consumer-facing tests.
- `scripts/TestConsumer.mjs` validates the packed package in a temporary project.

## Adding or changing a rule

1. Keep the rule ID in `kebab-case` and the implementation file in `PascalCase`.
2. Register the rule name in `src/rules/constants.ts`.
3. Add the rule to `src/plugin.ts`.
4. Provide `meta.type`, `meta.docs.description`, `meta.docs.url`, `meta.schema` and `meta.messages`.
5. Add a test that fails before the change and passes after it.
6. Update the README rule reference when behavior or options change.
7. Run `yarn verify`.

Rules enabled by `recommended` should also set `meta.docs.recommended: true`.

## Commit and pull request guidelines

- Prefer small, focused pull requests.
- Use conventional commit messages such as `feat:`, `fix:`, `docs:`, `test:` and `chore:`.
- Describe the user-facing behavior change and the tests that cover it.
- Update `CHANGELOG.md` for user-facing changes.

## Release process

Releases are triggered by pushing a new version to `main`:

1. Update `package.json` and `CHANGELOG.md`.
2. Run `yarn test:release`.
3. Commit and push the changes to `main`.
4. `.github/workflows/publish.yml` detects the version change, runs lint, typecheck, tests and build, publishes to npm, creates/pushes the matching `v<version>` tag and creates the GitHub Release. Release notes are generated from the commit messages, so conventional commit subjects become the user-facing release details.

If the version is already on npm but the tag or release is missing, pushing to `main` again creates the missing item without republishing. Never publish locally without the release workflow unless explicitly necessary.
