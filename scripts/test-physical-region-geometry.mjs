import assert from 'node:assert/strict'
import { expandPhysicalLogicalBounds,physicalIoU,PHYSICAL_WINDOW_HEIGHT_RATIOS,PHYSICAL_WINDOW_WIDTH_RATIOS,suppressNestedPhysicalCandidates } from '../src/lib/deck-image-recognition/physical-region-geometry.ts'
assert.ok(PHYSICAL_WINDOW_WIDTH_RATIOS.length>=5&&PHYSICAL_WINDOW_HEIGHT_RATIOS.length>=5,'multi-scale proposals')
const card={x:100,y:80,width:63,height:88,score:.9},inner={x:112,y:95,width:40,height:45,score:.7},neighbor={x:190,y:80,width:63,height:88,score:.85}
const expanded=expandPhysicalLogicalBounds(card,.3);assert.ok(expanded.x<card.x&&expanded.y<card.y&&expanded.width>card.width&&expanded.height>card.height)
assert.deepEqual(suppressNestedPhysicalCandidates([inner,card,neighbor],.18,10).map(x=>x.score),[.9,.85])
assert.equal(physicalIoU(card,card),1);assert.equal(physicalIoU(card,neighbor),0)
const brokenBorder={...card,score:.8};assert.ok(expandPhysicalLogicalBounds(brokenBorder).width>=card.width)
const offsetFour={x:100,y:80,width:115,height:88,score:.92};assert.equal(suppressNestedPhysicalCandidates([card,inner,offsetFour],.18,10)[0],offsetFour)
const twoBrokenBorders={x:101,y:82,width:60,height:84,score:.82};assert.ok(physicalIoU(expandPhysicalLogicalBounds(twoBrokenBorders),expanded)>.8)
const sleeveBorder={x:97,y:77,width:69,height:94,score:.88};assert.equal(suppressNestedPhysicalCandidates([inner,sleeveBorder],.18,10)[0],sleeveBorder)
const slightPerspectiveEnvelope={x:98,y:79,width:68,height:91,score:.86};assert.ok(physicalIoU(expandPhysicalLogicalBounds(slightPerspectiveEnvelope),expanded)>.7)
const offsetTwo={x:100,y:80,width:78,height:88,score:.87};assert.ok(expandPhysicalLogicalBounds(offsetTwo).width>offsetTwo.width)
console.log('Physical region geometry: pass')
