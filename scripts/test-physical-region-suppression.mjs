import assert from 'node:assert/strict'
import { buildPhysicalCardScaleModel, classifyPhysicalProposal, consolidatePhysicalStackProposals, rankPhysicalStackProposals, scorePhysicalStackProposal } from '../src/lib/deck-image-recognition/physical-region-geometry.ts'

const feature=(overrides={})=>({areaRatio:.025,aspectRatio:63/88,borderCompleteness:.82,edgeDensity:.28,interiorEdgeDensity:.24,exteriorEdgeDensity:.2,borderToInteriorRatio:1.2,edgeTouchPenalty:0,proposalSource:'connected-component',finalScore:.8,...overrides})
const stack={x:20,y:20,width:90,height:130,score:.9,proposalFeatures:feature({areaRatio:.06,exteriorEdgeDensity:.34})}
const innerArtwork={x:38,y:45,width:48,height:60,score:.86,proposalFeatures:feature({areaRatio:.012,interiorEdgeDensity:.58,exteriorEdgeDensity:.04,proposalSource:'dense-window'})}
const playmatText={x:0,y:5,width:180,height:45,score:.92,proposalFeatures:feature({areaRatio:.04,aspectRatio:4,edgeTouchPenalty:1,interiorEdgeDensity:.61,exteriorEdgeDensity:.03,proposalSource:'dense-window'})}
const neighbor={x:140,y:20,width:90,height:130,score:.88,proposalFeatures:feature({areaRatio:.055,exteriorEdgeDensity:.31})}
const ranked=rankPhysicalStackProposals([innerArtwork,playmatText,neighbor,stack],3)
assert.deepEqual(ranked.map(x=>x.x),[20,140,38],'full stacks win while neighboring stacks remain separate')
assert.ok(scorePhysicalStackProposal(stack.proposalFeatures)>scorePhysicalStackProposal(innerArtwork.proposalFeatures),'stack envelope outranks nested artwork')
assert.ok(scorePhysicalStackProposal(stack.proposalFeatures)>scorePhysicalStackProposal(playmatText.proposalFeatures),'image-edge playmat text is rejected')
assert.deepEqual(rankPhysicalStackProposals([stack,{...stack,score:.8}],1),[stack],'deterministic score tie uses detector score')
const fingerprint={horizontalBands:[1,.75],verticalBands:[1,1],cornerSupport:1,perimeterHash:'1:.75:1:1:1'}
const lineage=(proposalId,rootIds,parentIds=[])=>({proposalId,rootIds,parentIds})
const proposal=(x,id,root,source='dense-window',overrides={})=>({x,y:20,width:90,height:130,score:.9,proposalFeatures:feature({proposalSource:source,lineage:lineage(id,[root]),edgeSupportFingerprint:fingerprint,...overrides})})
const parent=proposal(20,'parent','stack-a'),shifted=proposal(34,'shifted','stack-a'),scaleVariant={...proposal(25,'scale','stack-a'),width:98,height:138},crossSource=proposal(23,'component','component-a','connected-component',{lineage:lineage('component',['stack-a'])})
const adjacent=proposal(125,'neighbor','stack-b'),offsetNeighbor={...proposal(118,'offset-neighbor','stack-c','dense-window',{edgeSupportFingerprint:{horizontalBands:[.25,1],verticalBands:[.5,1],cornerSupport:.5,perimeterHash:'.25:1:.5:1:.5'}}),width:125},inner={...proposal(42,'inner','stack-a','dense-window',{lineage:lineage('inner',['stack-a'],['parent'])}),width:40,height:55}
const consolidated=consolidatePhysicalStackProposals([parent,shifted,scaleVariant,crossSource,adjacent,offsetNeighbor,inner])
assert.ok(consolidated.candidates.includes(parent),'parent stack retained')
assert.ok(!consolidated.candidates.includes(shifted)&&!consolidated.candidates.includes(scaleVariant),'shifted and scale siblings consolidate')
assert.ok(!consolidated.candidates.includes(crossSource),'cross-source children consolidate')
assert.ok(!consolidated.candidates.includes(inner),'nested children consolidate')
assert.ok(consolidated.candidates.includes(adjacent)&&consolidated.candidates.includes(offsetNeighbor),'true neighboring and offset stacks remain separate')
assert.equal(consolidated.decisions.filter(x=>x.decision==='duplicate-suppressed').length,4)
assert.equal(consolidated.candidates.length,3,'one logical stack keeps one region; top-card remains metadata')
const scale=buildPhysicalCardScaleModel([stack,neighbor,parent,adjacent])
const classify=(candidate,overrides)=>classifyPhysicalProposal({...candidate,proposalFeatures:feature(overrides)},scale).disposition
assert.equal(classify(stack,{edgeTouchPenalty:1}),'reject-background','image-edge background rejects')
assert.equal(classify({...stack,width:220,height:180},{areaRatio:.04,finalScore:.85}),'reject-merged','oversized neighboring-stack envelope rejects')
assert.equal(classify({...stack,width:180,height:55},{areaRatio:.006,aspectRatio:3.27,finalScore:.8}),'reject-fragment','wide partial fragment rejects')
assert.equal(classify(stack,{areaRatio:.012,borderToInteriorRatio:.55,interiorEdgeDensity:.62,finalScore:.8}),'reject-background','interior texture without perimeter rejects')
assert.equal(classify(stack,{areaRatio:.012,finalScore:.72}),'preserve-near-miss','shifted low-score card remains available')
assert.equal(classify(stack,{areaRatio:.012,finalScore:.86}),'retain','valid offset stack remains')
console.log('Physical region suppression: pass')
