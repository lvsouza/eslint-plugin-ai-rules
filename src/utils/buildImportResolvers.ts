import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { createNodeResolver } from 'eslint-plugin-import-x'
import { existsSync } from 'node:fs'
import path from 'node:path'


export const IMPORT_RESOLVER_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]

type TImportResolver =
  | ReturnType<typeof createNodeResolver>
  | ReturnType<typeof createTypeScriptImportResolver>

export function buildImportResolvers(
  rootAbsolutePath?: string,
): TImportResolver[] {
  const hasTsconfig =
    rootAbsolutePath !== undefined &&
    existsSync(path.join(rootAbsolutePath, 'tsconfig.json'))
  const useTypeScriptResolver = rootAbsolutePath === undefined || hasTsconfig

  return [
    ...(useTypeScriptResolver
      ? [
          createTypeScriptImportResolver(
            rootAbsolutePath ? { project: rootAbsolutePath } : undefined,
          ),
        ]
      : []),
    createNodeResolver({
      extensions: IMPORT_RESOLVER_EXTENSIONS,
    }),
  ]
}
