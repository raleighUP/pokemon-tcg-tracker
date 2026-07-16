export type PhysicalBounds = { x: number; y: number; width: number; height: number }
export type ScoredPhysicalBounds = PhysicalBounds & { score: number }
export const PHYSICAL_WINDOW_WIDTH_RATIOS=[.06,.1,.14,.18,.22,.26] as const
export const PHYSICAL_WINDOW_HEIGHT_RATIOS=[.07,.11,.15,.2,.26,.34] as const

export function physicalIoU(a: PhysicalBounds,b: PhysicalBounds){const l=Math.max(a.x,b.x),t=Math.max(a.y,b.y),r=Math.min(a.x+a.width,b.x+b.width),bt=Math.min(a.y+a.height,b.y+b.height),intersection=Math.max(0,r-l)*Math.max(0,bt-t),union=a.width*a.height+b.width*b.height-intersection;return union?intersection/union:0}
export function expandPhysicalLogicalBounds(bounds:PhysicalBounds,factor=.3):PhysicalBounds{const padding=Math.min(bounds.width,bounds.height)*factor;return{x:bounds.x-padding,y:bounds.y-padding,width:bounds.width+padding*2,height:bounds.height+padding*2}}
export function suppressNestedPhysicalCandidates<T extends ScoredPhysicalBounds>(candidates:T[],overlap=.18,limit=48){const selected:T[]=[];for(const candidate of [...candidates].sort((a,b)=>b.score-a.score||b.width*b.height-a.width*a.height)){if(selected.some(existing=>physicalIoU(existing,candidate)>overlap))continue;selected.push(candidate);if(selected.length>=limit)break}return selected}
