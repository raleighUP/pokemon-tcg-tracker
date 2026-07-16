import { PHYSICAL_ANNOTATION_SCHEMA_VERSION, type NormalizedBounds, type NormalizedPoint, type PhysicalFixtureAnnotations } from './schema.ts'

export type ExpectedDeckRow = { quantity: number; name: string; setCode: string; collectorNumber: string }
export type AnnotationIssue = { severity: 'error' | 'warning'; code: string; message: string; regionId?: string }
export type AnnotationIdentityStatus = 'repository-resolved' | 'manual-complete' | 'manual-incomplete'

export function annotationIdentityStatus(region: PhysicalFixtureAnnotations['regions'][number]): AnnotationIdentityStatus {
  if (region.exactPrintReferenceId || region.exactPrintKey) return 'repository-resolved'
  if (region.cardName.trim() && region.setCode?.trim() && region.collectorNumber?.trim()) return 'manual-complete'
  return 'manual-incomplete'
}

const key = (name: string, setCode = '', number = '') => `${name.trim().toLowerCase().replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ')}|${setCode.trim().toLowerCase() === 'sv2' ? 'pal' : setCode.trim().toLowerCase()}|${number.trim().toLowerCase()}`
const validBounds = (bounds: NormalizedBounds) => bounds.x >= 0 && bounds.y >= 0 && bounds.width > 0 && bounds.height > 0 && bounds.x + bounds.width <= 1 && bounds.y + bounds.height <= 1
const containsBounds = (parent: NormalizedBounds, child: NormalizedBounds) => child.x >= parent.x && child.y >= parent.y && child.x + child.width <= parent.x + parent.width && child.y + child.height <= parent.y + parent.height
const containsPoint = (parent: NormalizedBounds, point: NormalizedPoint) => point.x >= parent.x && point.y >= parent.y && point.x <= parent.x + parent.width && point.y <= parent.y + parent.height

export function validatePhysicalAnnotations(annotation: PhysicalFixtureAnnotations, expectedRows: ExpectedDeckRow[] = []) {
  const issues: AnnotationIssue[] = []
  if (annotation.schemaVersion !== PHYSICAL_ANNOTATION_SCHEMA_VERSION) issues.push({ severity: 'error', code: 'schema', message: `Unsupported schema version ${annotation.schemaVersion}.` })
  if (!annotation.fixtureId.trim()) issues.push({ severity: 'error', code: 'fixture-id', message: 'Fixture ID is required.' })
  const ids = new Set<string>()
  const annotated = new Map<string, number>()
  for (const region of annotation.regions) {
    if (ids.has(region.id)) issues.push({ severity: 'error', code: 'duplicate-id', message: `Duplicate region ID ${region.id}.`, regionId: region.id })
    ids.add(region.id)
    if (!validBounds(region.normalizedBounds)) issues.push({ severity: 'error', code: 'bounds', message: 'Stack bounds must be positive and inside the image.', regionId: region.id })
    if (region.topCardBounds && !validBounds(region.topCardBounds)) issues.push({ severity: 'error', code: 'top-bounds', message: 'Top-card bounds must be positive and inside the image.', regionId: region.id })
    if (region.topCardBounds && !containsBounds(region.normalizedBounds, region.topCardBounds)) issues.push({ severity: 'warning', code: 'top-containment', message: 'Top-card bounds meaningfully overlap but are not fully contained by the parent stack region.', regionId: region.id })
    if (region.topCardQuad && (region.topCardQuad.length !== 4 || region.topCardQuad.some((point) => !containsPoint(region.normalizedBounds, point)))) issues.push({ severity: 'error', code: 'top-quad', message: 'All four top-card corners must stay inside the parent stack region.', regionId: region.id })
    const basicEnergy = /^(basic )?.+ energy$/i.test(region.cardName)
    if (!Number.isInteger(region.quantity) || region.quantity < 1 || (!basicEnergy && region.quantity > 4)) issues.push({ severity: 'error', code: 'quantity', message: 'Ordinary quantities must be integers from 1 to 4.', regionId: region.id })
    const identityStatus = annotationIdentityStatus(region)
    if (identityStatus === 'manual-incomplete' && !region.unresolved) issues.push({ severity: 'error', code: 'identity', message: 'Select a reference or provide printed name, set code, and collector number.', regionId: region.id })
    if (identityStatus === 'manual-complete') issues.push({ severity: 'warning', code: 'manual-reference', message: 'Complete manual printed identity is accepted without a repository reference.', regionId: region.id })
    if (!region.topCardBounds) issues.push({ severity: 'warning', code: 'missing-top-card', message: 'Top-card crop is missing.', regionId: region.id })
    if (region.quantity === 4 && region.presentation === 'single') issues.push({ severity: 'warning', code: 'presentation', message: 'Quantity four is marked as a single card.', regionId: region.id })
    const rowKey = key(region.cardName, region.setCode, region.collectorNumber)
    annotated.set(rowKey, (annotated.get(rowKey) ?? 0) + region.quantity)
  }
  const total = annotation.regions.reduce((sum, region) => sum + region.quantity, 0)
  if (total !== annotation.expectedDeckTotal) issues.push({ severity: 'error', code: 'total', message: `Annotated total is ${total}; expected ${annotation.expectedDeckTotal}.` })
  const checklist = expectedRows.map((row) => {
    const annotatedQuantity = annotated.get(key(row.name, row.setCode, row.collectorNumber)) ?? 0
    return { ...row, annotatedQuantity, status: annotatedQuantity === row.quantity ? 'complete' : annotatedQuantity < row.quantity ? 'missing' : 'over' }
  })
  for (const row of checklist.filter((row) => row.status !== 'complete')) issues.push({ severity: 'error', code: 'exact-list', message: `${row.name} annotated ${row.annotatedQuantity}; expected ${row.quantity}.` })
  return { status: issues.some((issue) => issue.severity === 'error') ? (annotation.regions.length ? 'incomplete' : 'draft') : 'valid', total, checklist, issues }
}
