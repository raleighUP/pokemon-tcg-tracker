import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

await import('./build-physical-annotation-catalog.mjs')
const catalog=JSON.parse(readFileSync('public/physical-fixtures/catalog.json','utf8'))
const locked={aob:24,'neddy-dragapult':28,'rahul-crustle':30,'slop-box':32}
const cleanName=(v='')=>v.normalize('NFKC').toLowerCase().replace(/\s*\([^)]*\)\s*/g,' ').replace(/[’]/g,"'").replace(/\s+/g,' ').trim()
const setAliases={sv2:'pal'}
const cleanSet=(v='')=>setAliases[v.toLowerCase()]??v.toLowerCase()
const key=(v)=>`${cleanName(v.cardName??v.name)}|${cleanSet(v.setCode)}|${String(v.collectorNumber??'').toLowerCase().trim()}`
const inside=(b)=>b&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=1.000001&&b.y+b.height<=1.000001
const contains=(a,b)=>b.x>=a.x-.000001&&b.y>=a.y-.000001&&b.x+b.width<=a.x+a.width+.000001&&b.y+b.height<=a.y+a.height+.000001
let failures=0
const reports=[]
for(const fixture of catalog.fixtures){
 const file=path.join('test-data/deck-image-importer',fixture.id,`${fixture.id}.physical-annotations.json`), errors=[],warnings=[]
 if(!existsSync(file)){errors.push('annotation file missing');reports.push({fixture:fixture.name,errors});failures++;continue}
 const a=JSON.parse(readFileSync(file,'utf8')), ids=new Set(), annotated=new Map();let repositoryResolved=0,manualComplete=0,manualIncomplete=0,missingTopCard=0
 if(a.schemaVersion!==1)errors.push('unsupported schemaVersion');if(a.fixtureId!==fixture.id)errors.push('fixtureId mismatch')
 if(a.image?.fileName!==fixture.imageFile||a.image?.width!==fixture.width||a.image?.height!==fixture.height)errors.push('image metadata mismatch')
 if(a.regions?.length!==locked[fixture.id])errors.push(`logical-region count ${a.regions?.length}; expected ${locked[fixture.id]}`)
 for(const r of a.regions??[]){
  if(ids.has(r.id))errors.push(`duplicate region ID ${r.id}`);ids.add(r.id)
  if(!inside(r.normalizedBounds))errors.push(`invalid bounds ${r.id}`)
  if(r.topCardBounds&&!inside(r.topCardBounds))errors.push(`invalid top-card bounds ${r.id}`);else if(r.topCardBounds&&!contains(r.normalizedBounds,r.topCardBounds))warnings.push(`${r.cardName}: top-card crop meaningfully overlaps but is not fully contained`)
  if(r.topCardQuad&&(r.topCardQuad.length!==4||r.topCardQuad.some(p=>p.x<0||p.y<0||p.x>1||p.y>1)))errors.push(`invalid top-card quadrilateral ${r.id}`);else if(r.topCardQuad?.some(p=>p.x<r.normalizedBounds.x-.000001||p.y<r.normalizedBounds.y-.000001||p.x>r.normalizedBounds.x+r.normalizedBounds.width+.000001||p.y>r.normalizedBounds.y+r.normalizedBounds.height+.000001))warnings.push(`${r.cardName}: quadrilateral extends outside parent stack`)
  if(!Number.isInteger(r.quantity)||r.quantity<1)errors.push(`invalid quantity ${r.id}`);if(!r.presentation)errors.push(`missing presentation ${r.id}`)
  const complete=Boolean(r.cardName?.trim()&&r.setCode?.trim()&&typeof r.collectorNumber==='string'&&r.collectorNumber.trim())
  if(r.exactPrintReferenceId||r.exactPrintKey)repositoryResolved++;else if(complete){manualComplete++;warnings.push(`${r.cardName}: complete manual identity`)}else{manualIncomplete++;errors.push(`manual identity incomplete ${r.id}`)}
  if(!r.topCardBounds){missingTopCard++;warnings.push(`${r.cardName}: top-card crop missing`)}
  if(r.presentation==='offset-stack'&&r.stack?.exposedEdgeCount!==r.quantity-1)warnings.push(`${r.cardName}: exposed edges ${r.stack?.exposedEdgeCount??'missing'}; expected ${r.quantity-1}`)
  const ratio=r.normalizedBounds.width/r.normalizedBounds.height;if(ratio<.2||ratio>5)warnings.push(`${r.cardName}: unusual region aspect ratio ${ratio.toFixed(2)}`)
  if(r.normalizedBounds.x<.001||r.normalizedBounds.y<.001||r.normalizedBounds.x+r.normalizedBounds.width>.999||r.normalizedBounds.y+r.normalizedBounds.height>.999)warnings.push(`${r.cardName}: region touches image edge`)
  annotated.set(key(r),(annotated.get(key(r))??0)+r.quantity)
 }
 const total=(a.regions??[]).reduce((s,r)=>s+r.quantity,0);if(total!==60)errors.push(`annotated total ${total}; expected 60`)
 let exactMatches=0,manualMatches=0,missingRows=0,overRows=0,quantityMismatches=0
 for(const row of fixture.expectedRows){const n=annotated.get(key({cardName:row.name,setCode:row.setCode,collectorNumber:row.collectorNumber}))??0;if(n===row.quantity){const rs=a.regions.filter(r=>key(r)===key({cardName:row.name,setCode:row.setCode,collectorNumber:row.collectorNumber}));if(rs.every(r=>r.exactPrintReferenceId||r.exactPrintKey))exactMatches++;else manualMatches++}else{quantityMismatches++;if(n<row.quantity)missingRows++;if(n>row.quantity)overRows++;errors.push(`${row.name} ${row.setCode} ${row.collectorNumber}: annotated ${n}; expected ${row.quantity}`)}}
 for(const [k,n] of annotated)if(!fixture.expectedRows.some(row=>key({cardName:row.name,setCode:row.setCode,collectorNumber:row.collectorNumber})===k)){overRows++;errors.push(`unexpected annotated row ${k} quantity ${n}`)}
 const report={fixture:fixture.name,fixtureId:fixture.id,file,regions:a.regions.length,total,expectedRows:fixture.expectedRows.length,exactMatches,manualMatches,missingRows,overRows,quantityMismatches,repositoryResolved,manualComplete,manualIncomplete,missingTopCard,warnings,errors,status:errors.length?'INVALID':'VALID'};reports.push(report);if(errors.length)failures++
 console.log(`${fixture.name}: ${report.status}\n  image: ${errors.includes('image metadata mismatch')?'invalid':'valid'}; regions: ${report.regions}; cards: ${total}; exact/manual rows: ${exactMatches}/${manualMatches}; repository/manual identities: ${repositoryResolved}/${manualComplete}; warnings: ${warnings.length}; errors: ${errors.length}`)
 if(errors.length)for(const e of errors)console.log(`  ERROR ${e}`)
}
console.log(`Physical fixtures: ${reports.filter(r=>r.status==='VALID').length}/${catalog.fixtures.length} valid`)
if(failures)process.exitCode=1
