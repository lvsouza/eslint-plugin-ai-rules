import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { createNodeResolver } from 'eslint-plugin-import-x'
import { existsSync, readdirSync } from 'node:fs'
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

function findTypeScriptConfig(rootAbsolutePath: string): string | undefined {
  for (const fileName of ['tsconfig.json', 'jsconfig.json']) {
    const filePath = path.join(rootAbsolutePath, fileName)

    if (existsSync(filePath)) return filePath
  }

  try {
    const fileName = readdirSync(rootAbsolutePath)
      .filter((entry) => /^tsconfig\..+\.json$/.test(entry))
      .sort()[0]

    return fileName ? path.join(rootAbsolutePath, fileName) : undefined
  } catch {
    return undefined
  }
}

export function buildImportResolvers(
  rootAbsolutePath?: string,
): TImportResolver[] {
  const tsConfigPath = rootAbsolutePath
    ? findTypeScriptConfig(rootAbsolutePath)
    : undefined
  const useTypeScriptResolver =
    rootAbsolutePath === undefined || tsConfigPath !== undefined

  return [
    ...(useTypeScriptResolver
      ? [
          createTypeScriptImportResolver(
            tsConfigPath ? { project: tsConfigPath } : undefined,
          ),
        ]
      : []),
    createNodeResolver({
      extensions: IMPORT_RESOLVER_EXTENSIONS,
    }),
  ]
}
