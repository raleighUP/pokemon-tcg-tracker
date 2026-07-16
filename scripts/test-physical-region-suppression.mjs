import assert from 'node:assert/strict'
import { rankPhysicalStackProposals, scorePhysicalStackProposal } from '../src/lib/deck-image-recognition/physical-region-geometry.ts'

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
console.log('Physical region suppression: pass')
