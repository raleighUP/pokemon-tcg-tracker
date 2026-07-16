import type { PhysicalFixtureAnnotations } from './schema.ts'

const PREFIX = 'top-cut-physical-annotation:'
export const draftKey = (fixtureId: string, width: number, height: number) => `${PREFIX}${fixtureId}:${width}x${height}`
export function saveAnnotationDraft(value: PhysicalFixtureAnnotations) {
  localStorage.setItem(draftKey(value.fixtureId, value.image.width, value.image.height), JSON.stringify(value))
}
export function loadAnnotationDraft(fixtureId: string, width: number, height: number): PhysicalFixtureAnnotations | null {
  const raw = localStorage.getItem(draftKey(fixtureId, width, height))
  return raw ? JSON.parse(raw) : null
}
export function clearAnnotationDraft(fixtureId: string, width: number, height: number) {
  localStorage.removeItem(draftKey(fixtureId, width, height))
}
