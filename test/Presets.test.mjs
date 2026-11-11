import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Linter } from 'eslint'

import aiRules, { presets } from '../dist/index.js'

const ruleId = 'ai-rules/project-structure'

function lint(filename, structure) {
  return new Linter().verify(
    '',
    {
      files: ['**/*.{js,ts,tsx,mjs}'],
      plugins: { 'ai-rules': aiRules },
      settings: {
        'ai-rules': {
          project: {
            rootFolder: '.',
            structure,
          },
        },
      },
      rules: { [ruleId]: 'error' },
    },
    { filename },
  )
}

const validFrontendPaths = [
  'src/App.tsx',
  'src/shared/components/ui/Button.tsx',
  'src/shared/contexts/AuthContext.tsx',
  'src/shared/hooks/UseMediaQuery.ts',
  'src/pages/Dashboard.tsx',
  'src/pages/orders/Orders.tsx',
  'src/pages/orders/components/OrderStatusStepper.tsx',
  'src/pages/customize/helpers.ts',
  'src/pages/customize/tabs/pages/page-list/PagesList.tsx',
  'src/pages/customize/tabs/pages/layout-organizer/collisionDetection.ts',
  'src/pages/customize/tabs/pages/layout-organizer/contents/components/PreviewCard.tsx',
  'src/pages/orders/hooks/UseOrders.ts',
  'src/pages/orders/services/OrdersService.ts',
  'src/pages/orders/contexts/OrdersContext.tsx',
  'src/pages/orders/helpers/Format.ts',
  'src/shared/helpers/Format.ts',
  'src/shared/assets/index.ts',
  'src/shared/services/generated/admin-backend/models/index.ts',
  'src/shared/utils/FormatDate.ts',
  'e2e/pages/LoginPage.ts',
  'e2e/specs/Authentication.spec.ts',
  'e2e/support/api/AdminApi.ts',
  'scripts/SortImports.ts',
  'vite.config.ts',
]

const invalidFrontendPaths = [
  ['e2e/support/Api/AdminApi.ts', 'folderNotAllowed'],
  ['src/pages/MyFeature/Dashboard.tsx', 'folderNameMismatch'],
  ['src/pages/orders/utils/Helpers.ts', 'folderNotAllowed'],
  ['src/pages/orders/orders.tsx', 'fileNameMismatch'],
  ['src/components/ui/Button.tsx', 'folderNotAllowed'],
  ['src/services/random.ts', 'folderNotAllowed'],
  ['src/shared/services/random.ts', 'fileNotAllowed'],
  ['src/shared/assets/Icon.tsx', 'fileNotAllowed'],
  ['random.ts', 'fileNotAllowed'],
]

const validNextjsPaths = [
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/loading.tsx',
  'src/app/error.tsx',
  'src/app/global-error.tsx',
  'src/app/not-found.tsx',
  'src/app/template.tsx',
  'src/app/default.tsx',
  'src/app/route.ts',
  'src/app/sitemap.ts',
  'src/app/robots.ts',
  'src/app/manifest.ts',
  'src/app/opengraph-image.tsx',
  'src/app/icon.tsx',
  'src/app/providers.tsx',
  'src/app/global-not-found.tsx',
  'src/app/(marketing)/page.tsx',
  'src/app/(shop)/products/[slug]/page.tsx',
  'src/app/blog/[...slugs]/page.tsx',
  'src/app/blog/[[...slug]]/page.tsx',
  'src/app/dashboard/@modal/default.tsx',
  'src/app/dashboard/@analytics/page.tsx',
  'src/app/shop/(.)photo/page.tsx',
  'src/app/shop/(..)photo/page.tsx',
  'src/app/shop/(...)photo/page.tsx',
  'src/app/shop/(..)(..)photo/page.tsx',
  'src/app/api/users/route.ts',
  'src/middleware.ts',
  'src/proxy.ts',
  'src/instrumentation.ts',
  'src/instrumentation-client.ts',
  'next-env.d.ts',
  '.next/server/page.ts',
  'out/static.ts',
  'src/shared/components/ui/Button.tsx',
  'src/shared/assets/index.ts',
  'src/shared/assets/icons/index.ts',
  'src/shared/assets/brand-logos/index.ts',
  'src/pages/orders/Orders.tsx',
  'src/shared/pages/orders/Orders.tsx',
  'src/shared/pages/orders/helpers.ts',
  'src/shared/pages/orders/schema.ts',
  'src/shared/pages/orders/types.ts',
  'src/shared/pages/orders/components/OrderCard.tsx',
  'src/shared/pages/orders/hooks/UseOrders.ts',
  'src/shared/pages/orders/services/Orders.ts',
  'src/shared/pages/orders/contexts/OrdersContext.tsx',
  'src/shared/pages/orders/helpers/Format.ts',
]

const invalidNextjsPaths = [
  ['app/page.tsx', 'folderNotAllowed'],
  ['src/app/dashboard/Button.tsx', 'fileNotAllowed'],
  ['src/app/page.js', 'fileNotAllowed'],
  ['src/pages/MyFeature/Dashboard.tsx', 'folderNameMismatch'],
  ['src/app/MyRoute/page.tsx', 'folderNameMismatch'],
  ['src/app/my_route/page.tsx', 'folderNameMismatch'],
  ['src/app/foo bar/page.tsx', 'folderNameMismatch'],
  ['src/app/_components/page.tsx', 'folderNameMismatch'],
  ['src/app/(shop)/MyRoute/page.tsx', 'folderNameMismatch'],
  ['src/shared/pages/Orders.tsx', 'fileNotAllowed'],
  ['src/shared/pages/MyPage/Orders.tsx', 'folderNameMismatch'],
  ['src/shared/pages/orders/orders.tsx', 'fileNameMismatch'],
  ['src/shared/pages/orders/nope.ts', 'fileNotAllowed'],
  ['src/shared/pages/orders/utils/Helpers.ts', 'folderNotAllowed'],
  ['src/shared/assets/MyIcons/index.ts', 'folderNameMismatch'],
  ['src/shared/assets/icons/Icon.tsx', 'fileNotAllowed'],
]

const validBackendPaths = [
  'src/index.ts',
  'src/Server.ts',
  'src/Schemas.ts',
  'src/database/Connection.ts',
  'src/database/schema/File.ts',
  'src/env/index.ts',
  'src/helpers/ImageResponse.ts',
  'src/repositories/File.ts',
  'src/repositories/Setup.ts',
  'src/http/Routes.ts',
  'src/http/controllers/Health.ts',
  'src/http/controllers/product/List.ts',
  'src/http/controllers/product/image/Read.ts',
  'src/use-case/product/stock-movement/List.ts',
  'src/services/AuthenticationService.ts',
  'src/services/file-provider/LocalDiskProvider.ts',
  'src/services/notification/Email.ts',
  'src/http/types/jwt.d.ts',
  'src/@types/Global.d.ts',
  'test/GlobalSetup.ts',
  'test/ProvidedContext.d.ts',
  'test/Files.test.ts',
  'test/Helpers/Fixtures.ts',
  'drizzle.config.ts',
  'scripts/UpdateSwagger.ts',
  'orval.config.ts',
]

const invalidBackendPaths = [
  ['src/http/controllers/product/StockMovement/List.ts', 'folderNameMismatch'],
  ['src/use-case/product/Image/Read.ts', 'folderNameMismatch'],
  ['src/http/controllers/Product/List.ts', 'folderNameMismatch'],
  ['src/http/controllers/product/list.ts', 'fileNameMismatch'],
  ['src/nope.ts', 'fileNotAllowed'],
  ['src/services/file_provider/Email.ts', 'folderNameMismatch'],
  ['src/services/FileProvider/Email.ts', 'folderNameMismatch'],
]

test('frontend preset accepts reference paths', () => {
  for (const filename of validFrontendPaths) {
    assert.equal(lint(filename, presets.frontend.structure).length, 0, filename)
  }
})

test('frontend preset reports known violations', () => {
  for (const [filename, messageId] of invalidFrontendPaths) {
    const messages = lint(filename, presets.frontend.structure)

    assert.equal(messages.length, 1, filename)
    assert.equal(messages[0].messageId, messageId, filename)
  }
})

test('nextjs preset accepts reference paths', () => {
  for (const filename of validNextjsPaths) {
    assert.equal(lint(filename, presets.nextjs.structure).length, 0, filename)
  }
})

test('nextjs preset reports known violations', () => {
  for (const [filename, messageId] of invalidNextjsPaths) {
    const messages = lint(filename, presets.nextjs.structure)

    assert.equal(messages.length, 1, filename)
    assert.equal(messages[0].messageId, messageId, filename)
  }
})

test('backend preset accepts reference paths', () => {
  for (const filename of validBackendPaths) {
    assert.equal(lint(filename, presets.backend.structure).length, 0, filename)
  }
})

test('backend preset reports known violations', () => {
  for (const [filename, messageId] of invalidBackendPaths) {
    const messages = lint(filename, presets.backend.structure)

    assert.equal(messages.length, 1, filename)
    assert.equal(messages[0].messageId, messageId, filename)
  }
})

test('other preset does not validate structure', () => {
  const [config] = aiRules.configs.projects([
    { rootFolder: '.', preset: 'other' },
  ])
  const messages = new Linter().verify(
    '',
    {
      files: ['**/*.ts'],
      plugins: { 'ai-rules': aiRules },
      settings: config.settings,
      rules: {
        'ai-rules/project-structure':
          config.rules['ai-rules/project-structure'],
      },
    },
    { filename: 'Whatever.ts' },
  )

  assert.equal(messages.length, 0)
})
