export const TCGL_TO_API_SET_CODE_ALIASES = [
  {
    tcglSetCode: 'MEE',
    apiSetCode: 'SVE',
  },
]

export function normalizeSetCode(value) {
  return String(value).trim().toUpperCase()
}

export function getApiSetCodesForTcglSetCode(setCode) {
  const normalizedSetCode = normalizeSetCode(setCode)
  const aliases = TCGL_TO_API_SET_CODE_ALIASES
    .filter((alias) => normalizeSetCode(alias.tcglSetCode) === normalizedSetCode)
    .map((alias) => normalizeSetCode(alias.apiSetCode))

  return Array.from(new Set([normalizedSetCode, ...aliases]))
}

export function getPreferredTcglSetCode(apiSetCode) {
  const normalizedApiSetCode = normalizeSetCode(apiSetCode)
  const alias = TCGL_TO_API_SET_CODE_ALIASES.find(
    (entry) => normalizeSetCode(entry.apiSetCode) === normalizedApiSetCode
  )

  return alias ? normalizeSetCode(alias.tcglSetCode) : normalizedApiSetCode
}
