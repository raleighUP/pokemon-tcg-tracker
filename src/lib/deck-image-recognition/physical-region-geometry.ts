export type PhysicalBounds = { x: number; y: number; width: number; height: number }
export type ScoredPhysicalBounds = PhysicalBounds & { score: number }
export type PhysicalProposalRankingFeatures = {
  areaRatio:number; aspectRatio:number; borderCompleteness:number; edgeDensity:number
  interiorEdgeDensity:number; exteriorEdgeDensity:number; borderToInteriorRatio:number
  edgeTouchPenalty:number; proposalSource:'connected-component'|'dense-window'; finalScore:number
}
export const PHYSICAL_WINDOW_WIDTH_RATIOS=[.06,.1,.14,.18,.22,.26] as const
export const PHYSICAL_WINDOW_HEIGHT_RATIOS=[.07,.11,.15,.2,.26,.34] as const

export function physicalIoU(a: PhysicalBounds,b: PhysicalBounds){const l=Math.max(a.x,b.x),t=Math.max(a.y,b.y),r=Math.min(a.x+a.width,b.x+b.width),bt=Math.min(a.y+a.height,b.y+b.height),intersection=Math.max(0,r-l)*Math.max(0,bt-t),union=a.width*a.height+b.width*b.height-intersection;return union?intersection/union:0}
export function expandPhysicalLogicalBounds(bounds:PhysicalBounds,factor=.3):PhysicalBounds{const padding=Math.min(bounds.width,bounds.height)*factor;return{x:bounds.x-padding,y:bounds.y-padding,width:bounds.width+padding*2,height:bounds.height+padding*2}}
export function suppressNestedPhysicalCandidates<T extends ScoredPhysicalBounds>(candidates:T[],overlap=.18,limit=48){const selected:T[]=[];for(const candidate of [...candidates].sort((a,b)=>b.score-a.score||b.width*b.height-a.width*a.height)){if(selected.some(existing=>physicalIoU(existing,candidate)>overlap))continue;selected.push(candidate);if(selected.length>=limit)break}return selected}

// Logical stacks are usually larger than a single card frame. This score favors
// coherent outer-edge context and area while penalizing image-edge windows and
// card-aspect outliers. It is deliberately deterministic and fixture-agnostic.
export function scorePhysicalStackProposal(features:PhysicalProposalRankingFeatures){
  const aspectError=Math.abs(Math.log(Math.max(.01,features.aspectRatio)/(63/88)))
  return 1.882*features.finalScore+1.341*features.edgeDensity+.157*features.interiorEdgeDensity+
    2.365*features.exteriorEdgeDensity-.35*features.borderToInteriorRatio-
    2.83*features.edgeTouchPenalty-.737*(features.proposalSource==='dense-window'?1:0)+
    2.33*Math.log(features.areaRatio+.001)-1.359*aspectError-.135*features.borderCompleteness
}

export function rankPhysicalStackProposals<T extends PhysicalBounds & {score:number;proposalFeatures:PhysicalProposalRankingFeatures}>(candidates:T[],limit=36){
  const ranked=[...candidates].sort((a,b)=>scorePhysicalStackProposal(b.proposalFeatures)-scorePhysicalStackProposal(a.proposalFeatures)||b.score-a.score||b.width*b.height-a.width*a.height)
  const selected=ranked.slice(0,limit)
  // Keep one strong envelope exception: connected components and very wide
  // offset stacks carry geometry that dense card-sized windows cannot express.
  const envelope=limit===36?ranked.slice(limit).find(candidate=>candidate.proposalFeatures.proposalSource==='connected-component'||candidate.proposalFeatures.aspectRatio>3.2):undefined
  if(envelope)selected.push(envelope)
  return selected
}
