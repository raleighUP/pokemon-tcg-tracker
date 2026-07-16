import assert from 'node:assert/strict'
import { screenBoundsToNormalized, normalizedBoundsToDisplay } from '../src/lib/physical-annotations/coordinates.ts'
import { evaluatePhysicalRegions, intersectionOverUnion } from '../src/lib/physical-annotations/evaluation.ts'
import { createPhysicalAnnotationDraft } from '../src/lib/physical-annotations/schema.ts'
import { validatePhysicalAnnotations } from '../src/lib/physical-annotations/validation.ts'
import { readFileSync } from 'node:fs'

const normalized = screenBoundsToNormalized({x:100,y:50,width:200,height:100},1000,500)
assert.deepEqual(normalized,{x:.1,y:.1,width:.2,height:.2})
assert.deepEqual(normalizedBoundsToDisplay(normalized,1000,500),{x:100,y:50,width:200,height:100})
assert.equal(intersectionOverUnion({x:0,y:0,width:.5,height:.5},{x:0,y:0,width:.5,height:.5}),1)
const draft=createPhysicalAnnotationDraft({fixtureId:'test',fixtureName:'Test',image:{fileName:'source.jpg',width:1000,height:500},expectedDeckTotal:60,expectedLogicalRegions:2})
draft.regions=[{id:'a',normalizedBounds:{x:.1,y:.1,width:.2,height:.3},cardName:'Basic Psychic Energy',setCode:'SVE',collectorNumber:'5',quantity:56,presentation:'offset-stack',exactPrintReferenceId:'energy'},{id:'b',normalizedBounds:{x:.5,y:.1,width:.2,height:.3},cardName:'Meowth ex',setCode:'POR',collectorNumber:'62',quantity:4,presentation:'offset-stack',exactPrintReferenceId:'meowth'}]
assert.equal(validatePhysicalAnnotations(draft,[{name:'Basic Psychic Energy',setCode:'SVE',collectorNumber:'5',quantity:56},{name:'Meowth ex',setCode:'POR',collectorNumber:'62',quantity:4}]).status,'valid')
const invalid=structuredClone(draft);invalid.regions[1].quantity=5
assert.ok(validatePhysicalAnnotations(invalid).issues.some((issue)=>issue.code==='quantity'))
const quadrilateral=structuredClone(draft);quadrilateral.regions[0].topCardQuad=[{x:.11,y:.11},{x:.28,y:.12},{x:.27,y:.38},{x:.12,y:.37}]
assert.ok(!validatePhysicalAnnotations(quadrilateral).issues.some((issue)=>issue.code==='top-quad'))
quadrilateral.regions[0].topCardQuad[2]={x:.4,y:.4}
assert.ok(validatePhysicalAnnotations(quadrilateral).issues.some((issue)=>issue.code==='top-quad'))
const evaluation=evaluatePhysicalRegions(draft.regions,[{id:'one',bounds:draft.regions[0].normalizedBounds},{id:'duplicate',bounds:draft.regions[0].normalizedBounds},{id:'false',bounds:{x:.8,y:.8,width:.1,height:.1}}])
assert.equal(evaluation.matchedRegions,1);assert.equal(evaluation.duplicateRegions,1);assert.equal(evaluation.falseRegions,1);assert.equal(evaluation.missedRegions,1)
for(const [fixtureId,expectedRegions] of Object.entries({aob:24,'neddy-dragapult':28,'rahul-crustle':30,'slop-box':32})){
 const annotations=JSON.parse(readFileSync(`test-data/deck-image-importer/${fixtureId}/${fixtureId}.physical-annotations.json`,'utf8'))
 assert.equal(annotations.regions.length,expectedRegions,`${fixtureId} logical-region count`)
 assert.equal(annotations.regions.reduce((sum,region)=>sum+region.quantity,0),60,`${fixtureId} card total`)
 assert.equal(new Set(annotations.regions.map(region=>region.id)).size,expectedRegions,`${fixtureId} unique IDs`)
 assert.ok(annotations.regions.every(region=>region.quantity>0&&region.normalizedBounds.x>=0&&region.normalizedBounds.y>=0&&region.normalizedBounds.x+region.normalizedBounds.width<=1&&region.normalizedBounds.y+region.normalizedBounds.height<=1),`${fixtureId} valid regions`)
 assert.ok(annotations.regions.filter(region=>!region.exactPrintReferenceId&&!region.exactPrintKey).every(region=>region.cardName&&region.setCode&&typeof region.collectorNumber==='string'&&region.collectorNumber),`${fixtureId} manual identities complete`)
}
console.log('Physical annotation utilities: pass')
