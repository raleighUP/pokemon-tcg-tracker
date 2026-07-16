import type { DeckEntryCandidate } from './types'
import { PHYSICAL_RECOGNITION_CONFIG } from '@/lib/deck-recognition/physical-recognition-config.mjs'
import { expandPhysicalLogicalBounds, PHYSICAL_WINDOW_HEIGHT_RATIOS, PHYSICAL_WINDOW_WIDTH_RATIOS, rankPhysicalStackProposals, suppressNestedPhysicalCandidates } from './physical-region-geometry'

const CARD_ASPECT_RATIO = 63 / 88
const DEFAULT_DIGITAL_ENTRY_COUNT = 24

// EXPERIMENTAL DEBUG ONLY:
// This module does not perform real card-frame detection. It draws estimated
// coarse boxes for visual debugging while the proper CV proof of concept is
// built. Do not use this as production recognition logic.

type Bounds = {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

type CoarseEntryCandidate = {
  id: string
  bounds: Bounds
  index: number
  sourceStrategy: DeckEntryCandidate['sourceStrategy']
  confidence: number
  notes?: string[]
}

type GridPlan = {
  columns: number
  rows: number
  slotWidth: number
  slotHeight: number
  gapX: number
  gapY: number
  startX: number
  startY: number
  score: number
}

function getImageSize(image: HTMLImageElement | ImageBitmap) {
  if ('naturalWidth' in image && image.naturalWidth > 0) {
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
  }

  return {
    width: image.width,
    height: image.height,
  }
}

function clampBounds(bounds: Bounds, imageWidth: number, imageHeight: number) {
  const x = Math.max(0, Math.min(bounds.x, imageWidth - 1))
  const y = Math.max(0, Math.min(bounds.y, imageHeight - 1))
  const width = Math.max(1, Math.min(bounds.width, imageWidth - x))
  const height = Math.max(1, Math.min(bounds.height, imageHeight - y))

  return {
    ...bounds,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  }
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function estimateBackgroundColor(rgb: Uint8ClampedArray, width: number, height: number) {
  const sampleSize = Math.max(24, Math.round(Math.min(width, height) * 0.08))
  const red: number[] = []
  const green: number[] = []
  const blue: number[] = []
  const samplePixel = (x: number, y: number) => {
    const index = (y * width + x) * 4
    red.push(rgb[index] ?? 0)
    green.push(rgb[index + 1] ?? 0)
    blue.push(rgb[index + 2] ?? 0)
  }

  for (let y = 0; y < sampleSize; y += 2) {
    for (let x = 0; x < sampleSize; x += 2) {
      samplePixel(x, y)
      samplePixel(width - 1 - x, y)
      samplePixel(x, height - 1 - y)
      samplePixel(width - 1 - x, height - 1 - y)
    }
  }

  return {
    red: median(red),
    green: median(green),
    blue: median(blue),
  }
}

function dilate(mask: Uint8Array, width: number, height: number, radius: number) {
  const output = new Uint8Array(mask.length)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let found = false

      for (let dy = -radius; dy <= radius && !found; dy += 1) {
        const ny = y + dy

        if (ny < 0 || ny >= height) continue

        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx

          if (nx >= 0 && nx < width && mask[ny * width + nx]) {
            output[y * width + x] = 1
            found = true
            break
          }
        }
      }
    }
  }

  return output
}

function erode(mask: Uint8Array, width: number, height: number, radius: number) {
  const output = new Uint8Array(mask.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let foundAll = true
      for (let dy = -radius; dy <= radius && foundAll; dy += 1) {
        const nextY = y + dy
        if (nextY < 0 || nextY >= height) {
          foundAll = false
          break
        }
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nextX = x + dx
          if (nextX < 0 || nextX >= width || !mask[nextY * width + nextX]) {
            foundAll = false
            break
          }
        }
      }
      output[y * width + x] = foundAll ? 1 : 0
    }
  }
  return output
}

function findConnectedComponents(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const components: Array<Bounds & { pixels: number }> = []

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue

    let head = 0
    let tail = 0
    let pixels = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0

    visited[start] = 1
    queue[tail] = start
    tail += 1

    while (head < tail) {
      const current = queue[head]
      head += 1
      pixels += 1

      const x = current % width
      const y = Math.floor(current / width)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      const neighbors = [current - 1, current + 1, current - width, current + width]

      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= mask.length || visited[neighbor] || !mask[neighbor]) {
          continue
        }

        const neighborX = neighbor % width

        if (Math.abs(neighborX - x) > 1) continue

        visited[neighbor] = 1
        queue[tail] = neighbor
        tail += 1
      }
    }

    components.push({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixels,
    })
  }

  return components
}

function intersectionOverUnion(a: Bounds, b: Bounds) {
  const left = Math.max(a.x, b.x)
  const top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top)

  if (intersection === 0) return 0

  const areaA = a.width * a.height
  const areaB = b.width * b.height

  return intersection / (areaA + areaB - intersection)
}

function createDigitalForegroundMask(rgb: Uint8ClampedArray, width: number, height: number) {
  const background = estimateBackgroundColor(rgb, width, height)
  const mask = new Uint8Array(width * height)

  for (let index = 0; index < mask.length; index += 1) {
    const sourceIndex = index * 4
    const red = rgb[sourceIndex] ?? 0
    const green = rgb[sourceIndex + 1] ?? 0
    const blue = rgb[sourceIndex + 2] ?? 0
    const brightness = (red + green + blue) / 3
    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)
    const chroma = max - min
    const distance = Math.hypot(
      red - background.red,
      green - background.green,
      blue - background.blue
    )

    mask[index] = distance > 28 && (brightness > 34 || chroma > 24) ? 1 : 0
  }

  return dilate(mask, width, height, 1)
}

function scoreDigitalTile(
  component: Bounds & { pixels: number },
  imageWidth: number,
  imageHeight: number
) {
  const area = component.width * component.height
  const areaRatio = area / (imageWidth * imageHeight)
  const aspectRatio = component.width / component.height
  const aspectDifference = Math.abs(aspectRatio - CARD_ASPECT_RATIO)
  const aspectScore = Math.max(0, 1 - aspectDifference / 0.28)
  const density = component.pixels / area
  const densityScore = Math.min(1, Math.max(0, density / 0.32))

  if (
    component.width < imageWidth * 0.055 ||
    component.height < imageHeight * 0.14 ||
    areaRatio < 0.008 ||
    areaRatio > 0.08 ||
    aspectScore <= 0
  ) {
    return 0
  }

  return Number((aspectScore * 0.72 + densityScore * 0.28).toFixed(3))
}

function refineDigitalTileCandidate(component: Bounds, imageWidth: number, imageHeight: number) {
  const targetHeightFromWidth = component.width / CARD_ASPECT_RATIO
  const targetWidthFromHeight = component.height * CARD_ASPECT_RATIO
  let x = component.x
  let y = component.y
  let width = component.width
  let height = component.height

  if (targetHeightFromWidth > height) {
    const growth = targetHeightFromWidth - height
    y -= growth / 2
    height = targetHeightFromWidth
  } else if (targetWidthFromHeight > width) {
    const growth = targetWidthFromHeight - width
    x -= growth / 2
    width = targetWidthFromHeight
  }

  const padding = Math.round(Math.min(width, height) * 0.02)

  return clampBounds(
    {
      x: x - padding,
      y: y - padding,
      width: width + padding * 2,
      height: height + padding * 2,
    },
    imageWidth,
    imageHeight
  )
}

function mergeDuplicateCandidates<T extends Bounds & { score: number }>(candidates: T[]) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  const merged: T[] = []

  for (const candidate of sorted) {
    const duplicate = merged.some(
      (existing) => intersectionOverUnion(existing, candidate) > 0.45
    )

    if (!duplicate) {
      merged.push(candidate)
    }
  }

  return merged.sort((a, b) => a.y - b.y || a.x - b.x)
}

function buildGridPlan(
  imageWidth: number,
  imageHeight: number,
  columns: number,
  rows: number
): GridPlan | null {
  const safeWidth = imageWidth * 0.94
  const safeHeight = imageHeight * 0.9
  const slotWidth = safeWidth / columns
  const slotHeight = safeHeight / rows

  if (slotWidth <= 0 || slotHeight <= 0) return null

  const usedWidth = slotWidth * columns
  const usedHeight = slotHeight * rows
  const gapX = Math.max(0, slotWidth * 0.08)
  const gapY = Math.max(0, slotHeight * 0.08)
  const startX = (imageWidth - usedWidth) / 2
  const startY = (imageHeight - usedHeight) / 2
  const coverage = (usedWidth * usedHeight) / (imageWidth * imageHeight)
  const gridShapePenalty = Math.abs(columns / rows - imageWidth / imageHeight)
  const score = coverage - gridShapePenalty * 0.08

  return {
    columns,
    rows,
    slotWidth: slotWidth - gapX,
    slotHeight: slotHeight - gapY,
    gapX,
    gapY,
    startX,
    startY,
    score,
  }
}

function getExperimentalDigitalGridPlan(
  imageWidth: number,
  imageHeight: number
) {
  const gridShapes = [
    [6, 4],
    [4, 6],
    [5, 5],
    [8, 3],
    [3, 8],
  ] as const
  const plans = gridShapes
    .map(([columns, rows]) =>
      buildGridPlan(imageWidth, imageHeight, columns, rows)
    )
    .filter((plan): plan is GridPlan => plan !== null)
    .sort((a, b) => b.score - a.score)

  return plans[0]
}

function detectExperimentalDigitalCoarseEntries(
  imageWidth: number,
  imageHeight: number
): CoarseEntryCandidate[] {
  const plan = getExperimentalDigitalGridPlan(imageWidth, imageHeight)

  if (!plan) return []

  return Array.from({
    length: Math.min(plan.columns * plan.rows, DEFAULT_DIGITAL_ENTRY_COUNT),
  }).map((_, index) => {
    const column = index % plan.columns
    const row = Math.floor(index / plan.columns)
    const x = plan.startX + column * (plan.slotWidth + plan.gapX)
    const y = plan.startY + row * (plan.slotHeight + plan.gapY)

    return {
      id: `digital-entry-${row + 1}-${column + 1}`,
      bounds: {
        x,
        y,
        width: plan.slotWidth,
        height: plan.slotHeight,
      },
      index,
      sourceStrategy: 'digital-grid',
      confidence: Math.max(0.2, Math.min(0.82, plan.score)),
      notes: [
        'Experimental coarse grid estimate only; not actual card-frame detection.',
      ],
    }
  })
}

function refineRepresentativeCardFrame(
  coarseBounds: Bounds,
  imageWidth: number,
  imageHeight: number
) {
  // TODO: Replace this aspect-ratio crop with actual edge/contour frame
  // refinement from the CV prototype.
  const slotAspect = coarseBounds.width / coarseBounds.height
  let width = coarseBounds.width
  let height = coarseBounds.height

  if (slotAspect > CARD_ASPECT_RATIO) {
    width = height * CARD_ASPECT_RATIO
  } else {
    height = width / CARD_ASPECT_RATIO
  }

  width *= 0.94
  height *= 0.94

  return clampBounds(
    {
      x: coarseBounds.x + (coarseBounds.width - width) / 2,
      y: coarseBounds.y + (coarseBounds.height - height) / 2,
      width,
      height,
      rotation: coarseBounds.rotation,
    },
    imageWidth,
    imageHeight
  )
}

function estimatePhysicalStackQuantity(stackOffsetPixels: number) {
  // TODO: Replace this placeholder with stack-offset measurement.
  if (stackOffsetPixels <= 0) return 1

  return Math.max(1, Math.min(4, Math.round(stackOffsetPixels / 8) + 1))
}

function finalizeEntryCandidate(
  coarse: CoarseEntryCandidate,
  imageWidth: number,
  imageHeight: number
): DeckEntryCandidate {
  const representativeBounds = refineRepresentativeCardFrame(
    coarse.bounds,
    imageWidth,
    imageHeight
  )
  const groupBounds = clampBounds(coarse.bounds, imageWidth, imageHeight)
  const quantity =
    coarse.sourceStrategy === 'physical-layout'
      ? estimatePhysicalStackQuantity(
          Math.max(0, groupBounds.width - representativeBounds.width)
        )
      : null
  const quantityConfidence = coarse.sourceStrategy === 'physical-layout' ? 0.1 : 0
  const quantitySource = 'unknown'

  return {
    id: coarse.id,
    representativeBounds,
    groupBounds,
    estimatedQuantity: quantity ?? 1,
    quantity,
    quantityConfidence,
    quantitySource,
    x: representativeBounds.x,
    y: representativeBounds.y,
    width: representativeBounds.width,
    height: representativeBounds.height,
    rotation: representativeBounds.rotation,
    confidence: coarse.confidence,
    notes: coarse.notes,
    sourceStrategy: coarse.sourceStrategy,
  }
}

function detectDigitalDeckEntries(
  imageWidth: number,
  imageHeight: number
): DeckEntryCandidate[] {
  return detectExperimentalDigitalCoarseEntries(
    imageWidth,
    imageHeight
  ).map((coarse) => finalizeEntryCandidate(coarse, imageWidth, imageHeight))
}

function getCanvasImageData(image: HTMLImageElement | ImageBitmap) {
  if (typeof document === 'undefined') return null

  const { width, height } = getImageSize(image)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context || width <= 0 || height <= 0) return null

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  return context.getImageData(0, 0, width, height)
}

function percentile(values: Uint8Array, percent: number) {
  const histogram = new Uint32Array(256)
  for (const value of values) histogram[value] += 1
  const target = Math.floor(values.length * percent)
  let seen = 0
  for (let value = 0; value < histogram.length; value += 1) {
    seen += histogram[value]
    if (seen >= target) return value
  }
  return 255
}

function getPhysicalProcessingImageData(image: HTMLImageElement | ImageBitmap) {
  if (typeof document === 'undefined') return null
  const size = getImageSize(image)
  const scale = Math.min(
    1,
    PHYSICAL_RECOGNITION_CONFIG.processingMaximumDimension /
      Math.max(size.width, size.height)
  )
  const width = Math.max(1, Math.round(size.width * scale))
  const height = Math.max(1, Math.round(size.height * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)
  return { imageData: context.getImageData(0, 0, width, height), scale }
}

function createPhysicalEdgeMask(data: Uint8ClampedArray, width: number, height: number) {
  const gray = new Uint8Array(width * height)
  for (let index = 0; index < gray.length; index += 1) {
    const source = index * 4
    gray[index] = Math.round(
      (data[source] ?? 0) * 0.299 +
      (data[source + 1] ?? 0) * 0.587 +
      (data[source + 2] ?? 0) * 0.114
    )
  }
  const low = percentile(gray, 0.04)
  const high = percentile(gray, 0.96)
  const range = Math.max(1, high - low)
  for (let index = 0; index < gray.length; index += 1) {
    gray[index] = Math.max(0, Math.min(255, Math.round(((gray[index] - low) / range) * 255)))
  }
  const magnitude = new Uint8Array(gray.length)
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const tl = gray[(y - 1) * width + x - 1]
      const t = gray[(y - 1) * width + x]
      const tr = gray[(y - 1) * width + x + 1]
      const l = gray[y * width + x - 1]
      const r = gray[y * width + x + 1]
      const bl = gray[(y + 1) * width + x - 1]
      const b = gray[(y + 1) * width + x]
      const br = gray[(y + 1) * width + x + 1]
      const gx = -tl - 2 * l - bl + tr + 2 * r + br
      const gy = -tl - 2 * t - tr + bl + 2 * b + br
      magnitude[y * width + x] = Math.min(255, Math.round((Math.abs(gx) + Math.abs(gy)) / 4))
    }
  }
  const threshold = Math.max(32, percentile(magnitude, 0.88))
  const mask = new Uint8Array(magnitude.length)
  for (let index = 0; index < magnitude.length; index += 1) {
    mask[index] = magnitude[index] >= threshold ? 1 : 0
  }
  return erode(dilate(mask, width, height, 2), width, height, 1)
}

function scorePhysicalComponent(
  component: Bounds & { pixels: number },
  width: number,
  height: number
) {
  const area = component.width * component.height
  const areaRatio = area / (width * height)
  const aspect = component.width / component.height
  const difference = Math.abs(aspect - PHYSICAL_RECOGNITION_CONFIG.cardAspectRatio)
  if (
    areaRatio < PHYSICAL_RECOGNITION_CONFIG.minimumRegionAreaRatio ||
    areaRatio > PHYSICAL_RECOGNITION_CONFIG.maximumRegionAreaRatio ||
    aspect < 0.22 || aspect > 3.2
  ) return 0
  const aspectScore = Math.max(0.2, 1 - difference / 2.5)
  const density = component.pixels / area
  const densityScore = Math.max(0, 1 - Math.abs(density - 0.28) / 0.28)
  return Number((aspectScore * 0.75 + densityScore * 0.25).toFixed(3))
}

function detectPhysicalDenseWindows(mask: Uint8Array, width: number, height: number) {
  const stride = width + 1
  const integral = new Uint32Array((width + 1) * (height + 1))
  for (let y = 1; y <= height; y += 1) {
    let row = 0
    for (let x = 1; x <= width; x += 1) {
      row += mask[(y - 1) * width + x - 1]
      integral[y * stride + x] = integral[(y - 1) * stride + x] + row
    }
  }
  const sum = (x: number, y: number, w: number, h: number) => integral[(y+h)*stride+x+w]-integral[y*stride+x+w]-integral[(y+h)*stride+x]+integral[y*stride+x]
  const candidates: Array<Bounds & { score: number; proposalSource: 'dense-window' }> = []
  for (const wr of PHYSICAL_WINDOW_WIDTH_RATIOS) for (const hr of PHYSICAL_WINDOW_HEIGHT_RATIOS) {
    const w=Math.round(width*wr),h=Math.round(height*hr),step=Math.max(5,Math.round(Math.min(w,h)*.28))
    for(let y=0;y+h<=height;y+=step)for(let x=0;x+w<=width;x+=step){
      const density=sum(x,y,w,h)/(w*h);if(density<.075||density>.62)continue
      let active=0
      for(let gy=0;gy<3;gy++)for(let gx=0;gx<3;gx++){const x0=x+Math.floor(gx*w/3),y0=y+Math.floor(gy*h/3),x1=x+Math.floor((gx+1)*w/3),y1=y+Math.floor((gy+1)*h/3);if(sum(x0,y0,x1-x0,y1-y0)/((x1-x0)*(y1-y0))>.035)active++}
      if(active<6)continue
      candidates.push({x,y,width:w,height:h,score:Number((density*.7+active/30).toFixed(3)),proposalSource:'dense-window' as const})
    }
  }
  return suppressNestedPhysicalCandidates(candidates,.18,48)
}

function measurePhysicalProposal(candidate:Bounds&{score:number;proposalSource?:'connected-component'|'dense-window'},mask:Uint8Array,width:number,height:number){
 const sum=(x:number,y:number,w:number,h:number)=>{let total=0;for(let yy=Math.max(0,y);yy<Math.min(height,y+h);yy++)for(let xx=Math.max(0,x);xx<Math.min(width,x+w);xx++)total+=mask[yy*width+xx];return total}
 const x=Math.max(0,Math.round(candidate.x)),y=Math.max(0,Math.round(candidate.y)),w=Math.max(3,Math.min(width-x,Math.round(candidate.width))),h=Math.max(3,Math.min(height-y,Math.round(candidate.height))),band=Math.max(2,Math.round(Math.min(w,h)*.08)),area=w*h,innerW=Math.max(1,w-band*2),innerH=Math.max(1,h-band*2),inner=sum(x+band,y+band,innerW,innerH),total=sum(x,y,w,h),borderArea=Math.max(1,area-innerW*innerH),edgeDensity=total/area,interiorEdgeDensity=inner/(innerW*innerH),borderDensity=(total-inner)/borderArea
 const side=(sx:number,sy:number,sw:number,sh:number)=>sum(sx,sy,sw,sh)/Math.max(1,sw*sh),rawSides=[side(x,y,w,band),side(x+w-band,y,band,h),side(x,y+h-band,w,band),side(x,y,band,h)],sides=rawSides.map(n=>Math.min(1,n/.22)),borderCompleteness=sides.reduce((s,n)=>s+n,0)/4,outer=Math.max(2,band),ox=Math.max(0,x-outer),oy=Math.max(0,y-outer),ow=Math.min(width-ox,w+outer*2),oh=Math.min(height-oy,h+outer*2),exteriorArea=Math.max(1,ow*oh-area),exteriorEdgeDensity=Math.max(0,(sum(ox,oy,ow,oh)-total)/exteriorArea),edgeTouchPenalty=(x<=1||y<=1||x+w>=width-1||y+h>=height-1)?1:0,borderToInteriorRatio=borderDensity/Math.max(.01,interiorEdgeDensity),geometry=Math.max(0,1-Math.abs(w/h-.9)/2.4),backgroundContrast=Math.max(0,Math.min(1,Math.abs(borderDensity-exteriorEdgeDensity)/.35)),finalScore=borderCompleteness*.38+Math.min(1,borderToInteriorRatio)*.22+geometry*.18+Math.min(1,edgeDensity/.28)*.12+backgroundContrast*.1-edgeTouchPenalty*.2
 return{proposalSource:candidate.proposalSource??'connected-component' as const,areaRatio:area/(width*height),aspectRatio:w/h,rectangularity:Math.min(1,total/Math.max(1,candidate.score*area)),borderCompleteness,borderSides:{top:sides[0],right:sides[1],bottom:sides[2],left:sides[3],supportedSides:sides.filter(n=>n>=.55).length},edgeDensity,interiorEdgeDensity,exteriorEdgeDensity,borderToInteriorRatio,backgroundContrast,orientationConsistency:geometry,perspectiveScore:geometry,edgeTouchPenalty,childCandidateIds:[],finalScore}
}

export function detectPhysicalDeckEntries(
  image: HTMLImageElement | ImageBitmap
): DeckEntryCandidate[] {
  const processed = getPhysicalProcessingImageData(image)
  if (!processed) return []
  const { imageData, scale } = processed
  const edgeMask = createPhysicalEdgeMask(imageData.data, imageData.width, imageData.height)
  const components = findConnectedComponents(
    edgeMask,
    imageData.width,
    imageData.height
  )
  const scored = components
    .map((component) => ({
      ...component,proposalSource:'connected-component' as const,
      score: scorePhysicalComponent(component, imageData.width, imageData.height),
    }))
    .filter((candidate) => candidate.score >= 0.18)
  const denseWindows=detectPhysicalDenseWindows(edgeMask,imageData.width,imageData.height)
  const measured=mergeDuplicateCandidates([...denseWindows,...scored]).map(candidate=>({...candidate,proposalFeatures:measurePhysicalProposal(candidate,edgeMask,imageData.width,imageData.height)}))
  const candidates=rankPhysicalStackProposals(measured)
  const stageRegions=(items:Array<Bounds&{score?:number}>,prefix:string)=>items.slice(0,120).map((item,index)=>({id:`${prefix}-${index+1}`,bounds:{x:item.x/scale,y:item.y/scale,width:item.width/scale,height:item.height/scale},score:item.score,aspectRatio:item.width/item.height}))
  const detectorStages=[{stage:'raw-connected-components',regions:stageRegions(components,'raw')},{stage:'geometry-filtered-components',regions:stageRegions(scored,'geometry')},{stage:'card-like-candidates',regions:stageRegions(denseWindows,'window')},{stage:'final-logical-regions',regions:stageRegions(candidates,'final')}]
  return candidates.map((candidate, index) => {
    const logical = expandPhysicalLogicalBounds(candidate,.3)
    const topCardBounds = clampBounds({x:candidate.x/scale,y:candidate.y/scale,width:candidate.width/scale,height:candidate.height/scale},getImageSize(image).width,getImageSize(image).height)
    const bounds = clampBounds({
      x: logical.x / scale,
      y: logical.y / scale,
      width: logical.width / scale,
      height: logical.height / scale,
    }, getImageSize(image).width, getImageSize(image).height)
    return {
      id: `physical-entry-${String(index + 1).padStart(3, '0')}`,
      representativeBounds: bounds,
      groupBounds: bounds,
      logicalStackBounds: bounds,
      topCardBounds,
      detectorStages:index===0?detectorStages:undefined,
      proposalFeatures:candidate.proposalFeatures,
      estimatedQuantity: 1,
      quantity: 1,
      quantityConfidence: candidate.score,
      quantitySource: 'single-visible-card',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      confidence: candidate.score,
      notes: ['Physical edge-component card candidate; stack count unresolved beyond visible top card.'],
      sourceStrategy: 'physical-layout',
    }
  })
}

function detectDigitalDeckEntriesFromPixels(
  image: HTMLImageElement | ImageBitmap
): DeckEntryCandidate[] {
  const imageData = getCanvasImageData(image)

  if (!imageData) return []

  const mask = createDigitalForegroundMask(
    imageData.data,
    imageData.width,
    imageData.height
  )
  const components = findConnectedComponents(mask, imageData.width, imageData.height)
  const scored = components
    .map((component) => {
      const refined = refineDigitalTileCandidate(
        component,
        imageData.width,
        imageData.height
      )

      return {
        ...refined,
        score: scoreDigitalTile(component, imageData.width, imageData.height),
      }
    })
    .filter((candidate) => candidate.score >= 0.38)
  const merged = mergeDuplicateCandidates(scored).slice(0, 90)

  return merged.map((candidate, index) => {
    const coarse: CoarseEntryCandidate = {
      id: `digital-entry-${String(index + 1).padStart(3, '0')}`,
      bounds: candidate,
      index,
      sourceStrategy: 'digital-grid',
      confidence: candidate.score,
      notes: ['Digital foreground tile segmentation candidate.'],
    }

    return finalizeEntryCandidate(coarse, imageData.width, imageData.height)
  })
}

function detectPhysicalLayoutFallback(
  imageWidth: number,
  imageHeight: number
): DeckEntryCandidate[] {
  const groupWidth = Math.round(imageWidth * 0.7)
  const groupHeight = Math.round(
    Math.min(imageHeight * 0.86, groupWidth / CARD_ASPECT_RATIO)
  )
  const x = Math.round((imageWidth - groupWidth) / 2)
  const y = Math.round((imageHeight - groupHeight) / 2)
  const coarse: CoarseEntryCandidate = {
    id: 'physical-entry-placeholder-1',
    bounds: {
      x,
      y,
      width: groupWidth,
      height: groupHeight,
    },
    index: 0,
    sourceStrategy: 'physical-layout',
    confidence: 0.1,
    notes: [
      'Physical stack detection is placeholder-only; representative crop may be uncertain.',
    ],
  }

  return [finalizeEntryCandidate(coarse, imageWidth, imageHeight)]
}

export async function detectDeckEntryCandidates(
  image: HTMLImageElement | ImageBitmap,
  strategy: 'auto' | 'digital' | 'physical' = 'auto'
): Promise<DeckEntryCandidate[]> {
  const { width, height } = getImageSize(image)

  if (width <= 0 || height <= 0) return []

  if (strategy === 'physical') return detectPhysicalDeckEntries(image)

  const segmentedDigitalEntries = detectDigitalDeckEntriesFromPixels(image)

  if (segmentedDigitalEntries.length > 1) {
    return segmentedDigitalEntries
  }

  const digitalEntries = detectDigitalDeckEntries(width, height)

  if (digitalEntries.length > 1) {
    return digitalEntries
  }

  return detectPhysicalLayoutFallback(width, height)
}
