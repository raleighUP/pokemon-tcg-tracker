import {createHash} from 'node:crypto'
import {existsSync,readFileSync,readdirSync} from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

export const SUPPORTED_PHYSICAL_IMAGE_EXTENSIONS=new Set(['.jpg','.jpeg','.png','.webp'])
const sha256=file=>createHash('sha256').update(readFileSync(file)).digest('hex')
const slug=value=>value.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'physical-photo'
export async function scanPhysicalTrainingInbox({root='test-data/deck-image-importer/physical-training/incoming',knownImages=[]}={}){
  if(!existsSync(root))throw new Error(`Physical training inbox does not exist: ${root}`)
  const knownByHash=new Map(knownImages.filter(x=>x.hash).map(x=>[x.hash,x])),seen=new Map(),results=[]
  for(const fileName of readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile()&&x.name!=='.gitkeep').map(x=>x.name).sort((a,b)=>a.localeCompare(b))){const filePath=path.join(root,fileName),extension=path.extname(fileName).toLowerCase(),supported=SUPPORTED_PHYSICAL_IMAGE_EXTENSIONS.has(extension),blockingIssues=[];let hash=null,width=null,height=null,decodeError=null;if(!supported)blockingIssues.push(`Unsupported file type ${extension||'(none)'}.`);else{hash=sha256(filePath);try{const metadata=await sharp(filePath).metadata();width=metadata.width??null;height=metadata.height??null;if(!width||!height)blockingIssues.push('Image dimensions could not be determined.')}catch(error){decodeError=error instanceof Error?error.message:String(error);blockingIssues.push(`Image decode failed: ${decodeError}`)}}const existing=hash?knownByHash.get(hash):null,duplicateIncoming=hash?seen.get(hash):null;if(hash&&!seen.has(hash))seen.set(hash,fileName);if(existing)blockingIssues.push(`Exact duplicate of registered fixture ${existing.fixtureId}.`);else if(duplicateIncoming)blockingIssues.push(`Exact duplicate of incoming file ${duplicateIncoming}.`);results.push({fileName,fileType:extension||null,width,height,sha256:hash,duplicateStatus:existing?'existing-fixture':duplicateIncoming?'incoming-duplicate':'unique',existingFixtureMatch:existing?.fixtureId??null,proposedImageId:hash?`${slug(path.basename(fileName,extension))}-${hash.slice(0,10)}`:null,importReadiness:blockingIssues.length?'blocked':'requires-human-registration',blockingIssues,requiredHumanMetadata:['deckId','captureSessionId','physicalLayoutId','deviceClass','lightingCategory','backgroundCategory','cameraAngleCategory','cardLayoutCategory','annotator','reviewedBy'],reviewStatus:'unregistered',trainingEligible:false})}
  return results
}
