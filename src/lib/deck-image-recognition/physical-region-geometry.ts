export type PhysicalBounds = { x: number; y: number; width: number; height: number }
export type ScoredPhysicalBounds = PhysicalBounds & { score: number }
export type PhysicalProposalRankingFeatures = {
  areaRatio:number; aspectRatio:number; borderCompleteness:number; edgeDensity:number
  interiorEdgeDensity:number; exteriorEdgeDensity:number; borderToInteriorRatio:number
  edgeTouchPenalty:number; proposalSource:'connected-component'|'dense-window'; finalScore:number
  lineage?:{proposalId:string;parentIds:string[];rootIds:string[]}
  edgeSupportFingerprint?:{horizontalBands:number[];verticalBands:number[];cornerSupport:number;perimeterHash:string}
}
export type PhysicalProposalDecision={proposalId:string;decision:'retained'|'duplicate-suppressed';winnerId?:string;reasons:string[]}
export type PhysicalProposalDisposition='retain'|'reject-background'|'reject-fragment'|'reject-merged'|'reject-duplicate'|'preserve-near-miss'|'uncertain'
export type PhysicalProposalClassification={disposition:PhysicalProposalDisposition;confidence:number;reasons:string[]}
export type PhysicalCardScaleModel={medianWidth:number;medianHeight:number;medianArea:number;orientation:number;confidence:number}
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

function containmentRatio(a:PhysicalBounds,b:PhysicalBounds){const l=Math.max(a.x,b.x),t=Math.max(a.y,b.y),r=Math.min(a.x+a.width,b.x+b.width),bt=Math.min(a.y+a.height,b.y+b.height),intersection=Math.max(0,r-l)*Math.max(0,bt-t);return intersection/Math.min(a.width*a.height,b.width*b.height)}
function normalizedCenterDistance(a:PhysicalBounds,b:PhysicalBounds){return Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)/Math.sqrt(Math.min(a.width*a.height,b.width*b.height))}
function fingerprintSimilarity(a:PhysicalProposalRankingFeatures,b:PhysicalProposalRankingFeatures){const left=a.edgeSupportFingerprint,right=b.edgeSupportFingerprint;if(!left||!right)return 0;const av=[...left.horizontalBands,...left.verticalBands,left.cornerSupport],bv=[...right.horizontalBands,...right.verticalBands,right.cornerSupport];return 1-av.reduce((sum,value,index)=>sum+Math.abs(value-(bv[index]??0)),0)/av.length}
function sharesEvidence(a:PhysicalProposalRankingFeatures,b:PhysicalProposalRankingFeatures){const ar=a.lineage?.rootIds??[],br=b.lineage?.rootIds??[];return ar.some(root=>br.includes(root))||a.lineage?.parentIds.includes(b.lineage?.proposalId??'')||b.lineage?.parentIds.includes(a.lineage?.proposalId??'')}
function isParentChild(a:PhysicalProposalRankingFeatures,b:PhysicalProposalRankingFeatures){return a.lineage?.parentIds.includes(b.lineage?.proposalId??'')||b.lineage?.parentIds.includes(a.lineage?.proposalId??'')}

export function consolidatePhysicalStackProposals<T extends PhysicalBounds & {score:number;proposalFeatures:PhysicalProposalRankingFeatures}>(candidates:T[]){
  const retained:T[]=[],decisions:PhysicalProposalDecision[]=[]
  for(const candidate of candidates){
    const duplicate=retained.find(winner=>{const sameEvidence=sharesEvidence(candidate.proposalFeatures,winner.proposalFeatures),parentChild=isParentChild(candidate.proposalFeatures,winner.proposalFeatures),sameSource=candidate.proposalFeatures.proposalSource===winner.proposalFeatures.proposalSource,iou=physicalIoU(candidate,winner),containment=containmentRatio(candidate,winner),center=normalizedCenterDistance(candidate,winner),areaRatio=Math.max(candidate.width*candidate.height,winner.width*winner.height)/Math.min(candidate.width*candidate.height,winner.width*winner.height),fingerprint=fingerprintSimilarity(candidate.proposalFeatures,winner.proposalFeatures);if(sameEvidence)return(parentChild&&containment>=.9&&center<=1)||(center<=.3&&areaRatio<=1.8&&(iou>=.3||containment>=.75||fingerprint>=.95));if(sameSource)return(iou>=.28&&center<=.45&&areaRatio<=1.8&&fingerprint>=.82)||(candidate.proposalFeatures.proposalSource==='connected-component'&&iou>=.5&&center<=.4&&areaRatio<=1.3);return center<=.35&&areaRatio<=1.65&&iou>=.42&&fingerprint>=.82})
    const proposalId=candidate.proposalFeatures.lineage?.proposalId??`proposal-${decisions.length+1}`
    if(duplicate){decisions.push({proposalId,decision:'duplicate-suppressed',winnerId:duplicate.proposalFeatures.lineage?.proposalId,reasons:['shared proposal ancestry or cross-source edge evidence','similar center and geometry']});continue}
    retained.push(candidate);decisions.push({proposalId,decision:'retained',reasons:['best-ranked representative for independent evidence root']})
  }
  return{candidates:retained,decisions}
}

function median(values:number[]){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]??0}
export function buildPhysicalCardScaleModel<T extends PhysicalBounds & {proposalFeatures:PhysicalProposalRankingFeatures}>(candidates:T[]):PhysicalCardScaleModel{
  const reliable=candidates.filter(candidate=>candidate.proposalFeatures.finalScore>=.78&&!candidate.proposalFeatures.edgeTouchPenalty).slice(0,16),sample=reliable.length>=4?reliable:candidates.slice(0,16)
  return{medianWidth:median(sample.map(candidate=>candidate.width)),medianHeight:median(sample.map(candidate=>candidate.height)),medianArea:median(sample.map(candidate=>candidate.width*candidate.height)),orientation:median(sample.map(candidate=>Math.atan2(candidate.height,candidate.width))),confidence:Math.min(1,sample.length/8)}
}
export function classifyPhysicalProposal<T extends PhysicalBounds & {proposalFeatures:PhysicalProposalRankingFeatures}>(candidate:T,scale:PhysicalCardScaleModel):PhysicalProposalClassification{
  const features=candidate.proposalFeatures,areaRatio=features.areaRatio,aspect=features.aspectRatio,scaleArea=candidate.width*candidate.height/Math.max(1,scale.medianArea),orientationDelta=Math.abs(Math.atan2(candidate.height,candidate.width)-scale.orientation)
  if(features.edgeTouchPenalty>0)return{disposition:'reject-background',confidence:.98,reasons:['image-edge-contact','weak independent stack support']}
  if(areaRatio>.025)return{disposition:'reject-merged',confidence:.94,reasons:['oversized-envelope','multiple-stack-centers',scaleArea>2.5?'dominant-scale-outlier':'broad-image-coverage']}
  if(features.finalScore<.65)return{disposition:'reject-background',confidence:.9,reasons:['weak-perimeter','insufficient-evidence']}
  if(areaRatio>.006&&features.borderToInteriorRatio<.7)return{disposition:'reject-background',confidence:.86,reasons:['weak-perimeter','high-interior-texture',orientationDelta>.5?'orientation-outlier':'low-border-to-interior-ratio']}
  if((areaRatio<.008&&aspect>2.5)||(areaRatio<.006&&aspect<.7))return{disposition:'reject-fragment',confidence:.84,reasons:['undersized-fragment','implausible-card-footprint']}
  if(features.finalScore<.75||features.borderCompleteness<.7)return{disposition:'preserve-near-miss',confidence:.7,reasons:['likely-near-miss','correctable-border-or-score']}
  return{disposition:'retain',confidence:scale.confidence>=.5?.88:.76,reasons:['plausible-card-or-stack-geometry','dominant-scale-compatible']}
}
