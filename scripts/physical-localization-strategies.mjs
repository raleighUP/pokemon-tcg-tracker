const CARD_ASPECT=63/88
export const STRATEGIES=['baseline-v1','proposal-v2','perspective-first']
export const CONFIG={version:1,proposalLimit:160,mergeIoU:.62,centerDistance:.22,logicalPadding:.3,perspectiveConfidence:.72}

const iou=(a,b)=>{const l=Math.max(a.x,b.x),t=Math.max(a.y,b.y),r=Math.min(a.x+a.width,b.x+b.width),bt=Math.min(a.y+a.height,b.y+b.height),i=Math.max(0,r-l)*Math.max(0,bt-t),u=a.width*a.height+b.width*b.height-i;return u?i/u:0}
const centerDistance=(a,b)=>Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)/Math.sqrt(Math.min(a.width*a.height,b.width*b.height))
const expand=(b,f=CONFIG.logicalPadding)=>{const p=Math.min(b.width,b.height)*f;return{x:b.x-p,y:b.y-p,width:b.width+2*p,height:b.height+2*p}}
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)]??0
const normalize=(b,w,h)=>({x:b.x/w,y:b.y/h,width:b.width/w,height:b.height/h})

export function estimatePerspective(stages){
  const regions=stages.find(s=>s.stage==='geometry-filtered-components')?.regions??[]
  const cardLike=regions.filter(r=>r.bounds.width&&r.bounds.height).map(r=>r.bounds).filter(b=>{const ratio=Math.min(b.width/b.height,b.height/b.width);return Math.abs(Math.log(ratio/CARD_ASPECT))<.38})
  const ratios=cardLike.map(b=>Math.min(b.width/b.height,b.height/b.width)),spread=ratios.length?median(ratios.map(x=>Math.abs(x-median(ratios)))):1
  const confidence=Math.min(1,cardLike.length/12)*Math.max(0,1-spread/.15)
  return{confidence,applied:confidence>=CONFIG.perspectiveConfidence,dominantAngleDegrees:0,method:'axis-aligned component consensus',sampleSize:cardLike.length,reason:confidence>=CONFIG.perspectiveConfidence?'consistent card-like component geometry':'insufficient consistent oriented-edge evidence'}
}

function merge(candidates){
  const kept=[]
  for(const candidate of candidates.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))){
    const duplicate=kept.find(k=>iou(k.bounds,candidate.bounds)>=CONFIG.mergeIoU&&centerDistance(k.bounds,candidate.bounds)<=CONFIG.centerDistance)
    if(duplicate){duplicate.diagnostics.sources=[...new Set([...duplicate.diagnostics.sources,...candidate.diagnostics.sources])];duplicate.diagnostics.parentProposalIds.push(candidate.id);continue}
    kept.push(candidate);if(kept.length>=CONFIG.proposalLimit)break
  }
  return kept
}

export function localize(source,fixture,strategy){
  const baseline=(source?.diagnostics?.debugMatches??[]).map((m,i)=>({id:`baseline-${i+1}`,bounds:normalize(m.logicalStackBounds??m.candidateBounds,fixture.width,fixture.height),score:m.proposalFeatures?.finalScore??.5,diagnostics:{strategy:'baseline-v1',sources:[m.proposalFeatures?.proposalSource??'committed-final'],rawBounds:m.candidateBounds,scoreComponents:{detector:m.proposalFeatures?.finalScore??.5},parentProposalIds:[],refinementSteps:[]}}))
  if(strategy==='baseline-v1')return{proposals:baseline,perspective:null}
  const stages=source?.diagnostics?.debugMatches?.find(m=>m.detectorStages)?.detectorStages??[],perspective=estimatePerspective(stages),candidates=[]
  const add=(stage,sourceName,baseScore,transform=b=>b)=>{for(const [i,r] of (stages.find(s=>s.stage===stage)?.regions??[]).entries()){const raw=transform(r.bounds),bounds=normalize(expand(raw),fixture.width,fixture.height),aspect=Math.min(raw.width/raw.height,raw.height/raw.width),aspectScore=Math.exp(-Math.abs(Math.log(Math.max(.01,aspect)/CARD_ASPECT)));candidates.push({id:`${sourceName}-${i+1}`,bounds,score:baseScore+.35*(r.score??0)+.2*aspectScore,diagnostics:{strategy,sources:[sourceName],rawBounds:normalize(raw,fixture.width,fixture.height),normalizedBounds:bounds,scoreComponents:{stage:r.score??0,aspectPrior:aspectScore,base:baseScore},parentProposalIds:[r.id],refinementSteps:['logical-stack-expansion']}})}}
  add('geometry-filtered-components','connected-component',.3)
  add('card-like-candidates','dominant-scale-window',.42)
  add('raw-connected-components','stack-edge-envelope',.22,b=>({x:b.x-b.width*.08,y:b.y-b.height*.04,width:b.width*1.16,height:b.height*1.12}))
  let proposals=merge(candidates)
  if(strategy==='perspective-first'&&perspective.applied)proposals=proposals.map(p=>({...p,diagnostics:{...p.diagnostics,refinementSteps:[...p.diagnostics.refinementSteps,'perspective-confidence-gate']}}))
  return{proposals,perspective}
}
