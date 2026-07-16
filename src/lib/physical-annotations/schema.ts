export const PHYSICAL_ANNOTATION_SCHEMA_VERSION = 1

export type NormalizedBounds = { x: number; y: number; width: number; height: number }
export type NormalizedPoint = { x: number; y: number }
export type RegionPresentation = 'single' | 'offset-stack' | 'individual-copies' | 'mixed' | 'unknown'

export interface PhysicalRegionAnnotation {
  id: string
  normalizedBounds: NormalizedBounds
  topCardBounds?: NormalizedBounds
  topCardQuad?: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint]
  exactPrintReferenceId?: string
  exactPrintKey?: string
  cardName: string
  setCode?: string
  collectorNumber?: string
  regulationMark?: string
  unresolved?: boolean
  quantity: number
  presentation: RegionPresentation
  stack?: {
    offsetDirection?: 'down' | 'right' | 'down-right' | 'left' | 'up' | 'other'
    exposedEdgeCount?: number
    averageOffsetPixels?: number
  }
  conditions?: {
    glare?: 'none' | 'minor' | 'significant'
    shadow?: 'none' | 'minor' | 'significant'
    perspective?: 'low' | 'moderate' | 'high'
    partialOcclusion?: boolean
  }
  notes?: string
}

export interface PhysicalFixtureAnnotations {
  schemaVersion: number
  fixtureId: string
  fixtureName: string
  image: { fileName: string; width: number; height: number; sha256?: string }
  expectedDeckTotal: number
  expectedLogicalRegions: number
  captureConditions?: {
    cameraAngle?: 'overhead' | 'slight-angle' | 'unknown'
    lighting?: 'even' | 'minor-glare' | 'heavy-glare' | 'unknown'
    background?: string
    sleeves?: 'none' | 'matte' | 'glossy' | 'mixed' | 'unknown'
    notes?: string
  }
  regions: PhysicalRegionAnnotation[]
  createdAt: string
  updatedAt: string
}

export function createPhysicalAnnotationDraft(input: Omit<PhysicalFixtureAnnotations, 'schemaVersion' | 'regions' | 'createdAt' | 'updatedAt'>): PhysicalFixtureAnnotations {
  const now = new Date().toISOString()
  return { ...input, schemaVersion: PHYSICAL_ANNOTATION_SCHEMA_VERSION, regions: [], createdAt: now, updatedAt: now }
}
