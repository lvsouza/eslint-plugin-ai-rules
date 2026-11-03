import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Linter, RuleTester } from 'eslint'

import aiRules, { presets } from '../dist/index.js'

const rule = aiRules.rules['project-structure']

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

const settingsFor = (structure, rootFolder = '.') => ({
  'ai-rules': {
    project: {
      rootFolder,
      structure,
    },
  },
})

const frontendSettings = settingsFor(presets.frontend.structure)
const backendSettings = settingsFor(presets.backend.structure)

const customStructure = {
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
          folders: {
            utils: {
              files: ['*.ts'],
            },
          },
        },
      },
    },
  },
  ignoredPaths: ['ignored/**'],
}

const namedFolderStructure = {
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

const anyNamedFolderStructure = {
  folders: {
    '[anything]': {
      files: ['index.ts'],
    },
  },
}

const compoundExtensionsStructure = {
  folders: {
    src: {
      files: [
        { case: 'PascalCase', extensions: ['.d.ts'] },
        { case: 'PascalCase', extensions: ['.test.mjs'] },
        { case: 'PascalCase', extensions: ['.spec.ts'] },
      ],
    },
  },
}

const additionalFilesStructure = {
  folders: {
    src: {
      files: ['index.ts'],
      additionalFiles: [{ case: 'PascalCase', extensions: ['.ts'] }],
    },
  },
}

const ignoredFolderStructure = {
  folders: {
    ignored: { ignore: true },
  },
}

const ignoredPathsStructure = {
  folders: {
    src: {
      files: [{ case: 'PascalCase', extensions: ['.ts'] }],
    },
  },
  ignoredPaths: ['ignored/**', '**/*.generated.ts'],
}

ruleTester.run('project-structure', rule, {
  valid: [
    { code: '', filename: 'src/App.tsx', settings: frontendSettings },
    { code: '', filename: 'src/pages/Dashboard.tsx', settings: frontendSettings },
    {
      code: '',
      filename: 'src/pages/orders/components/OrderStatusStepper.tsx',
      settings: frontendSettings,
    },
    {
      code: '',
      filename:
        'src/pages/customize/tabs/pages/layout-organizer/contents/components/PreviewCard.tsx',
      settings: frontendSettings,
    },
    {
      code: '',
      filename: 'src/pages/customize/tabs/pages/layout-organizer/collisionDetection.ts',
      settings: frontendSettings,
    },
    {
      code: '',
      filename: 'e2e/specs/Authentication.spec.ts',
      settings: frontendSettings,
    },
    {
      code: '',
      filename: 'e2e/support/api/AdminApi.ts',
      settings: frontendSettings,
    },
    {
      code: '',
      filename: 'src/services/generated/foo.ts',
      settings: frontendSettings,
    },
    { code: '', filename: 'scripts/SortImports.ts', settings: frontendSettings },
    { code: '', filename: 'vite.config.ts', settings: frontendSettings },
    { code: '', filename: 'src/index.ts', settings: backendSettings },
    {
      code: '',
      filename: 'src/http/controllers/product/List.ts',
      settings: backendSettings,
    },
    {
      code: '',
      filename: 'src/http/controllers/product/image/Read.ts',
      settings: backendSettings,
    },
    {
      code: '',
      filename: 'src/use-case/product/stock-movement/List.ts',
      settings: backendSettings,
    },
    {
      code: '',
      filename: 'src/services/AuthenticationService.ts',
      settings: backendSettings,
    },
    {
      code: '',
      filename: 'src/services/generated/authentication-service/client.ts',
      settings: backendSettings,
    },
    {
      code: '',
      filename: 'src/create-user/CreateUserUseCase.ts',
      settings: settingsFor(customStructure),
    },
    {
      code: '',
      filename: 'src/create-user/utils/format-value.ts',
      settings: settingsFor(customStructure),
    },
    {
      code: '',
      filename: 'ignored/anything/random.ts',
      settings: settingsFor(customStructure),
    },
    {
      code: '',
      filename: 'anything/random.ts',
      settings: settingsFor({ ignore: true }),
    },
    {
      code: '',
      filename: 'feature-users-module/index.ts',
      settings: settingsFor(namedFolderStructure),
    },
    {
      code: '',
      filename: 'whatever/index.ts',
      settings: settingsFor(anyNamedFolderStructure),
    },
    {
      code: '',
      filename: 'src/Types.d.ts',
      settings: settingsFor(compoundExtensionsStructure),
    },
    {
      code: '',
      filename: 'src/Imports.test.mjs',
      settings: settingsFor(compoundExtensionsStructure),
    },
    {
      code: '',
      filename: 'src/Auth.spec.ts',
      settings: settingsFor(compoundExtensionsStructure),
    },
    {
      code: '',
      filename: 'src/index.ts',
      settings: settingsFor(additionalFilesStructure),
    },
    {
      code: '',
      filename: 'src/Other.ts',
      settings: settingsFor(additionalFilesStructure),
    },
    {
      code: '',
      filename: 'ignored/anything/Bad-Name.ts',
      settings: settingsFor(ignoredFolderStructure),
    },
    {
      code: '',
      filename: 'ignored/anything/file.txt',
      settings: settingsFor(ignoredFolderStructure),
    },
    {
      code: '',
      filename: 'ignored/anything/Bad-Name.ts',
      settings: settingsFor(ignoredPathsStructure),
    },
    {
      code: '',
      filename: 'src/foo.generated.ts',
      settings: settingsFor(ignoredPathsStructure),
    },
  ],
  invalid: [
    {
      code: '',
      filename: 'src/pages/MyFeature/Dashboard.tsx',
      settings: frontendSettings,
      errors: [
        {
          message: 'Folder "MyFeature" inside "src/pages" must match kebab-case.',
        },
      ],
    },
    {
      code: '',
      filename: 'src/pages/orders/utils/Helpers.ts',
      settings: frontendSettings,
      errors: [{ messageId: 'folderNotAllowed' }],
    },
    {
      code: '',
      filename: 'e2e/support/Api/AdminApi.ts',
      settings: frontendSettings,
      errors: [
        {
          message:
            'Folder "Api" is not allowed inside "e2e/support". Allowed folders: api.',
        },
      ],
    },
    {
      code: '',
      filename: 'src/services/random.ts',
      settings: frontendSettings,
      errors: [
        {
          message:
            'File "random.ts" is not allowed inside "src/services". Allowed files: none.',
        },
      ],
    },
    {
      code: '',
      filename: 'src/pages/orders/notPascal.tsx',
      settings: frontendSettings,
      errors: [
        {
          message:
            'File "notPascal.tsx" inside "src/pages/orders" must match PascalCase, extension .tsx.',
        },
      ],
    },
    {
      code: '',
      filename: 'random.ts',
      settings: frontendSettings,
      errors: [{ messageId: 'fileNotAllowed' }],
    },
    {
      code: '',
      filename: 'src/use-case/product/Image/Read.ts',
      settings: backendSettings,
      errors: [
        {
          messageId: 'folderNameMismatch',
          data: {
            folder: 'Image',
            parent: 'src/use-case/product',
            expected: 'kebab-case',
          },
        },
      ],
    },
    {
      code: '',
      filename: 'src/http/controllers/product/StockMovement/List.ts',
      settings: backendSettings,
      errors: [{ messageId: 'folderNameMismatch' }],
    },
    {
      code: '',
      filename: 'src/http/controllers/product/list.ts',
      settings: backendSettings,
      errors: [{ messageId: 'fileNameMismatch' }],
    },
    {
      code: '',
      filename: 'src/CreateUser/CreateUserUseCase.ts',
      settings: settingsFor(customStructure),
      errors: [{ messageId: 'folderNameMismatch' }],
    },
    {
      code: '',
      filename: 'src/create-user/CreateUser.ts',
      settings: settingsFor(customStructure),
      errors: [{ messageId: 'fileNameMismatch' }],
    },
    {
      code: '',
      filename: 'src/create-user/nested/Foo.ts',
      settings: settingsFor(customStructure),
      errors: [{ messageId: 'folderNotAllowed' }],
    },
    {
      code: '',
      filename: 'root.ts',
      settings: settingsFor(customStructure),
      errors: [{ messageId: 'fileNotAllowed' }],
    },
    {
      code: '',
      filename: 'users-module/index.ts',
      settings: settingsFor(namedFolderStructure),
      errors: [{ messageId: 'folderNameMismatch' }],
    },
    {
      code: '',
      filename: 'feature-users/index.ts',
      settings: settingsFor(namedFolderStructure),
      errors: [{ messageId: 'folderNameMismatch' }],
    },
    {
      code: '',
      filename: 'feature-Users-module/index.ts',
      settings: settingsFor(namedFolderStructure),
      errors: [{ messageId: 'folderNameMismatch' }],
    },
    {
      code: '',
      filename: 'src/types.d.ts',
      settings: settingsFor(compoundExtensionsStructure),
      errors: [{ messageId: 'fileNameMismatch' }],
    },
    {
      code: '',
      filename: 'src/imports.test.mjs',
      settings: settingsFor(compoundExtensionsStructure),
      errors: [{ messageId: 'fileNameMismatch' }],
    },
    {
      code: '',
      filename: 'src/auth.spec.ts',
      settings: settingsFor(compoundExtensionsStructure),
      errors: [{ messageId: 'fileNameMismatch' }],
    },
    {
      code: '',
      filename: 'src/other.ts',
      settings: settingsFor(additionalFilesStructure),
      errors: [{ messageId: 'fileNameMismatch' }],
    },
    {
      code: '',
      filename: 'src/other.ts',
      settings: settingsFor(ignoredPathsStructure),
      errors: [{ messageId: 'fileNameMismatch' }],
    },
  ],
})

const ruleId = 'ai-rules/project-structure'

function lint(filename, project, rootFolder = '.') {
  return new Linter().verify(
    '',
    {
      files: ['**/*.{js,ts,tsx}'],
      plugins: { 'ai-rules': aiRules },
      settings: settingsFor(project, rootFolder),
      rules: { [ruleId]: 'error' },
    },
    { filename },
  )
}

test('ignores files outside the configured rootFolder', () => {
  assert.equal(lint('other/src/App.tsx', presets.frontend.structure, 'app').length, 0)
})

test('chooses the most specific root when multiple projects are configured', () => {
  const messages = new Linter().verify(
    '',
    {
      files: ['**/*.{js,ts,tsx}'],
      plugins: { 'ai-rules': aiRules },
      settings: {
        'ai-rules': {
          projects: [
            { rootFolder: 'app', structure: presets.frontend.structure },
            {
              rootFolder: 'app/admin',
              structure: {
                folders: {
                  src: {
                    files: ['index.ts'],
                    folders: {},
                  },
                },
              },
            },
          ],
        },
      },
      rules: { [ruleId]: 'error' },
    },
    { filename: 'app/admin/src/App.tsx' },
  )

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, 'fileNotAllowed')
})

test('supports prefix and regex patterns in file rules', () => {
  const structure = {
    folders: {
      src: {
        files: [
          { case: 'PascalCase', prefix: 'Use', extensions: ['.ts'] },
          {
            case: 'PascalCase',
            pattern: '^(Create|Read)[A-Z][A-Za-z0-9]*$',
            extensions: ['.ts'],
          },
        ],
      },
    },
  }

  assert.equal(lint('src/UseAuth.ts', structure).length, 0)
  assert.equal(lint('src/CreateUser.ts', structure).length, 0)
  assert.equal(lint('src/ReadUser.ts', structure).length, 0)
  assert.equal(lint('src/Auth.ts', structure).length, 1)
})

test('does nothing without settings', () => {
  const messages = new Linter().verify(
    '',
    {
      files: ['**/*.ts'],
      plugins: { 'ai-rules': aiRules },
      rules: { [ruleId]: 'error' },
    },
    { filename: 'src/anything.ts' },
  )

  assert.equal(messages.length, 0)
})

test('does nothing when the project has no structure', () => {
  const messages = new Linter().verify(
    '',
    {
      files: ['**/*.ts'],
      plugins: { 'ai-rules': aiRules },
      settings: {
        'ai-rules': {
          project: {
            rootFolder: '.',
          },
        },
      },
      rules: { [ruleId]: 'error' },
    },
    { filename: 'src/anything.ts' },
  )

  assert.equal(messages.length, 0)
})

test('reports the full dynamic folder naming rule', () => {
  const messages = lint('users-module/index.ts', namedFolderStructure)

  assert.equal(messages.length, 1)
  assert.equal(
    messages[0].message,
    'Folder "users-module" inside "." must match prefix "feature-", suffix "-module", pattern /^feature-[a-z-]+-module$/.',
  )
})
