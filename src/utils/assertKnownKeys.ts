export function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(
        `${label}: "${path}.${key}" is not a supported property.`,
      )
    }
  }
}
