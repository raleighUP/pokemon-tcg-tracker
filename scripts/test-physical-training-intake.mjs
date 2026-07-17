import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {copyFileSync,existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import sharp from 'sharp'
import {loadExamples} from './physical-training-dataset.mjs'
import {scanPhysicalTrainingInbox} from './physical-training-intake.mjs'

const intakeRoot='test-data/deck-image-importer/physical-training'
for(const name of ['incoming','imported','rejected'])assert.ok(existsSync(path.join(intakeRoot,name)),`${name} directory exists`)
assert.ok(existsSync(path.join(intakeRoot,'README.md')),'README exists')
for(const name of ['incoming/photo.jpg','imported/photo.png','rejected/photo.webp']){const ignored=spawnSync('git',['check-ignore','--no-index','-q',path.join(intakeRoot,name)]);assert.equal(ignored.status,0,`${name} must be ignored`)}

const temporary=mkdtempSync(path.join(tmpdir(),'physical-intake-test-'))
try{const first=path.join(temporary,'A Photo.JPG'),duplicate=path.join(temporary,'b-duplicate.jpeg'),unsupported=path.join(temporary,'notes.txt');await sharp({create:{width:32,height:24,channels:3,background:'#336699'}}).jpeg().toFile(first);copyFileSync(first,duplicate);writeFileSync(unsupported,'not an image');const originalHash=createHash('sha256').update(readFileSync(first)).digest('hex'),before=readFileSync(first);const one=await scanPhysicalTrainingInbox({root:temporary}),two=await scanPhysicalTrainingInbox({root:temporary});assert.deepEqual(one,two,'intake scan is deterministic');assert.deepEqual(readFileSync(first),before,'scan never overwrites original bytes');assert.equal(one.map(x=>x.fileName).join('|'),'A Photo.JPG|b-duplicate.jpeg|notes.txt');assert.equal(one[0].width,32);assert.equal(one[0].height,24);assert.equal(one[0].sha256,originalHash);assert.equal(one[1].duplicateStatus,'incoming-duplicate');assert.equal(one[2].importReadiness,'blocked');assert.match(one[2].blockingIssues[0],/Unsupported file type/);assert.ok(one.every(x=>x.trainingEligible===false&&x.reviewStatus==='unregistered'));assert.ok(one[0].requiredHumanMetadata.includes('captureSessionId'));assert.equal('deckId' in one[0],false,'human metadata is not fabricated')}finally{rmSync(temporary,{recursive:true,force:true})}

assert.deepEqual(loadExamples().map(x=>x.fixtureId),['aob','neddy-dragapult','rahul-crustle','slop-box'],'incoming files never become dataset examples and canonical benchmark is unchanged')
console.log('Physical training intake: pass')
