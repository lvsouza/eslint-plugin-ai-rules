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
  ],
  invalid: [
    {
      code: '',
      filename: 'src/pages/MyFeature/Dashboard.tsx',
      settings: frontendSettings,
      errors: [
        {
          messageId: 'folderNameMismatch',
          data: {
            folder: 'MyFeature',
            parent: 'src/pages',
            expected: 'kebab-case',
          },
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
      errors: [{ messageId: 'folderNotAllowed' }],
    },
    {
      code: '',
      filename: 'src/services/random.ts',
      settings: frontendSettings,
      errors: [{ messageId: 'fileNotAllowed' }],
    },
    {
      code: '',
      filename: 'src/pages/orders/notPascal.tsx',
      settings: frontendSettings,
      errors: [{ messageId: 'fileNameMismatch' }],
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
