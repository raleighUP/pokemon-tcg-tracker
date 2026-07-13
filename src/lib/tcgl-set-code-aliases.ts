export type SetCodeAlias = {
  tcglSetCode: string
  apiSetCode: string
}

export const TCGL_TO_API_SET_CODE_ALIASES: SetCodeAlias[] = [
  {
    tcglSetCode: 'MEE',
    apiSetCode: 'SVE',
  },
]

export function normalizeSetCode(value: string) {
  return value.trim().toUpperCase()
}

export function getApiSetCodesForTcglSetCode(setCode: string) {
  const normalizedSetCode = normalizeSetCode(setCode)
  const aliases = TCGL_TO_API_SET_CODE_ALIASES
    .filter((alias) => normalizeSetCode(alias.tcglSetCode) === normalizedSetCode)
    .map((alias) => normalizeSetCode(alias.apiSetCode))

  return Array.from(new Set([normalizedSetCode, ...aliases]))
}

export function getPreferredTcglSetCode(apiSetCode: string) {
  const normalizedApiSetCode = normalizeSetCode(apiSetCode)
  const alias = TCGL_TO_API_SET_CODE_ALIASES.find(
    (entry) => normalizeSetCode(entry.apiSetCode) === normalizedApiSetCode
  )

  return alias ? normalizeSetCode(alias.tcglSetCode) : normalizedApiSetCode
}
