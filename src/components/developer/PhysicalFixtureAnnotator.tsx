'use client'

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, FieldLabel, NumberInput, Panel, SelectField, TextInput, TextareaField } from '@/components/ui'
import { initializeCardReferenceRepository, searchRepositoryCardsByNormalizedName } from '@/lib/card-reference-repository'
import { clampNormalizedBounds } from '@/lib/physical-annotations/coordinates'
import { evaluatePhysicalRegions, type DetectorRegion } from '@/lib/physical-annotations/evaluation'
import { clearAnnotationDraft, loadAnnotationDraft, saveAnnotationDraft } from '@/lib/physical-annotations/persistence'
import { createPhysicalAnnotationDraft, PHYSICAL_ANNOTATION_SCHEMA_VERSION, type NormalizedBounds, type NormalizedPoint, type PhysicalFixtureAnnotations, type PhysicalRegionAnnotation } from '@/lib/physical-annotations/schema'
import { validatePhysicalAnnotations, type ExpectedDeckRow } from '@/lib/physical-annotations/validation'
import type { CardReference } from '@/types'

type Fixture = { id: string; name: string; imageFile: string; imageUrl: string; exactFile: string; width: number; height: number; expectedTotal: number; expectedRows: ExpectedDeckRow[] }
type Catalog = { fixtures: Fixture[] }
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url)
}

function trimToParent(parent: NormalizedBounds, child: NormalizedBounds): NormalizedBounds {
  const x = Math.max(parent.x, child.x); const y = Math.max(parent.y, child.y)
  const right = Math.min(parent.x + parent.width, child.x + child.width)
  const bottom = Math.min(parent.y + parent.height, child.y + child.height)
  return { x, y, width: Math.max(0.001, right - x), height: Math.max(0.001, bottom - y) }
}

export default function PhysicalFixtureAnnotator() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [fixtureId, setFixtureId] = useState('aob')
  const [draft, setDraft] = useState<PhysicalFixtureAnnotations | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<PhysicalFixtureAnnotations[]>([])
  const [future, setFuture] = useState<PhysicalFixtureAnnotations[]>([])
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; topCard: boolean; targetRegionId?: string } | null>(null)
  const [editing, setEditing] = useState<{ id: string; mode: 'move' | 'resize'; startX: number; startY: number; original: NormalizedBounds; current: NormalizedBounds } | null>(null)
  const [preview, setPreview] = useState<NormalizedBounds | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showLabels, setShowLabels] = useState(true)
  const [showDetector, setShowDetector] = useState(true)
  const [hideAnnotations, setHideAnnotations] = useState(false)
  const [topCardMode, setTopCardMode] = useState(false)
  const [quadMode, setQuadMode] = useState(false)
  const [quadPoints, setQuadPoints] = useState<NormalizedPoint[]>([])
  const [quadTargetId, setQuadTargetId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cardResults, setCardResults] = useState<CardReference[]>([])
  const [detectorRegions, setDetectorRegions] = useState<DetectorRegion[]>([])
  const [savedAt, setSavedAt] = useState<string>('')
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetch('/physical-fixtures/catalog.json').then((response) => response.json()).then(setCatalog); initializeCardReferenceRepository() }, [])
  const fixture = catalog?.fixtures.find((item) => item.id === fixtureId)
  useEffect(() => {
    if (!fixture) return
    const stored = loadAnnotationDraft(fixture.id, fixture.width, fixture.height)
    // Fixture selection intentionally resets the editor transaction state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(stored ?? createPhysicalAnnotationDraft({ fixtureId: fixture.id, fixtureName: fixture.name, image: { fileName: fixture.imageFile, width: fixture.width, height: fixture.height }, expectedDeckTotal: fixture.expectedTotal, expectedLogicalRegions: fixture.expectedRows.length }))
    setSelectedId(null); setHistory([]); setFuture([]); setDetectorRegions([]); setQuadMode(false); setQuadPoints([]); setQuadTargetId(null)
  }, [fixture])
  useEffect(() => {
    if (!draft) return
    const timer = window.setTimeout(() => { saveAnnotationDraft({ ...draft, updatedAt: new Date().toISOString() }); setSavedAt(new Date().toLocaleTimeString()) }, 450)
    return () => window.clearTimeout(timer)
  }, [draft])

  const commit = useCallback((next: PhysicalFixtureAnnotations) => {
    if (!draft) return
    setHistory((items) => [...items.slice(-49), clone(draft)]); setFuture([]); setDraft({ ...next, updatedAt: new Date().toISOString() })
  }, [draft])
  const selected = draft?.regions.find((region) => region.id === selectedId)
  const validation = useMemo(() => draft && fixture ? validatePhysicalAnnotations(draft, fixture.expectedRows) : null, [draft, fixture])
  const metrics = useMemo(() => evaluatePhysicalRegions(draft?.regions ?? [], detectorRegions), [draft, detectorRegions])

  const point = (event: React.PointerEvent) => {
    const bounds = canvasRef.current!.getBoundingClientRect()
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) }
  }
  const pointerDown = (event: React.PointerEvent) => {
    if (!draft || (topCardMode && !selected)) return
    const start = point(event)
    if (quadMode) {
      const contains = (region: PhysicalRegionAnnotation) => start.x >= region.normalizedBounds.x && start.y >= region.normalizedBounds.y && start.x <= region.normalizedBounds.x + region.normalizedBounds.width && start.y <= region.normalizedBounds.y + region.normalizedBounds.height
      const targetId = quadTargetId ?? (selected && contains(selected) ? selected.id : draft.regions.filter(contains).sort((a,b) => a.normalizedBounds.width*a.normalizedBounds.height-b.normalizedBounds.width*b.normalizedBounds.height)[0]?.id) ?? '__new__'
      const next = [...quadPoints, start]; setSelectedId(targetId); setQuadTargetId(targetId)
      if (next.length === 4) {
        const xs = next.map((item) => item.x); const ys = next.map((item) => item.y)
        const quad = next as [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint]
        const quadBounds = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs)-Math.min(...xs), height: Math.max(...ys)-Math.min(...ys) }
        if (targetId === '__new__') {
          const id = `region-${crypto.randomUUID()}`
          const region: PhysicalRegionAnnotation = { id, normalizedBounds: quadBounds, topCardBounds: quadBounds, topCardQuad: quad, cardName: '', quantity: 1, presentation: 'unknown', unresolved: true }
          commit({ ...draft, regions: [...draft.regions, region] }); setSelectedId(id)
        } else commit({ ...draft, regions: draft.regions.map((item) => item.id === targetId ? { ...item, topCardQuad: quad, topCardBounds: trimToParent(item.normalizedBounds, quadBounds) } : item) })
        setQuadMode(false); setQuadPoints([]); setQuadTargetId(null)
      } else setQuadPoints(next)
      return
    }
    setDrawing({ startX: start.x, startY: start.y, topCard: topCardMode, targetRegionId: topCardMode ? selectedId ?? undefined : undefined }); setPreview({ x: start.x, y: start.y, width: 0, height: 0 }); event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: React.PointerEvent) => {
    if (editing) {
      const end = point(event)
      const dx = end.x - editing.startX; const dy = end.y - editing.startY
      const next = editing.mode === 'move'
        ? { ...editing.original, x: editing.original.x + dx, y: editing.original.y + dy }
        : { ...editing.original, width: editing.original.width + dx, height: editing.original.height + dy }
      setEditing({ ...editing, current: clampNormalizedBounds(next) })
      return
    }
    if (!drawing) return
    const end = point(event); setPreview({ x: Math.min(drawing.startX, end.x), y: Math.min(drawing.startY, end.y), width: Math.abs(end.x - drawing.startX), height: Math.abs(end.y - drawing.startY) })
  }
  const pointerUp = () => {
    if (editing && draft) {
      commit({ ...draft, regions: draft.regions.map((region) => region.id === editing.id ? { ...region, normalizedBounds: editing.current } : region) })
      setEditing(null)
      return
    }
    if (!draft || !drawing || !preview || preview.width < 0.005 || preview.height < 0.005) { setDrawing(null); setPreview(null); return }
    if (drawing.topCard && drawing.targetRegionId) commit({ ...draft, regions: draft.regions.map((region) => {
      if (region.id !== drawing.targetRegionId) return region
      return { ...region, topCardBounds: trimToParent(region.normalizedBounds, preview) }
    }) })
    else {
      const region: PhysicalRegionAnnotation = { id: `region-${crypto.randomUUID()}`, normalizedBounds: preview, cardName: '', quantity: 1, presentation: 'unknown', unresolved: true }
      commit({ ...draft, regions: [...draft.regions, region] }); setSelectedId(region.id)
    }
    setDrawing(null); setPreview(null); setTopCardMode(false)
  }
  const beginEdit = (event: React.PointerEvent, region: PhysicalRegionAnnotation, mode: 'move' | 'resize') => {
    event.stopPropagation(); setSelectedId(region.id)
    const start = point(event)
    if (topCardMode) {
      setDrawing({ startX: start.x, startY: start.y, topCard: true, targetRegionId: region.id })
      setPreview({ x: start.x, y: start.y, width: 0, height: 0 })
      canvasRef.current?.setPointerCapture(event.pointerId)
      return
    }
    setEditing({ id: region.id, mode, startX: start.x, startY: start.y, original: region.normalizedBounds, current: region.normalizedBounds })
    canvasRef.current?.setPointerCapture(event.pointerId)
  }
  const updateSelected = (patch: Partial<PhysicalRegionAnnotation>) => selected && draft && commit({ ...draft, regions: draft.regions.map((region) => region.id === selected.id ? { ...region, ...patch } : region) })
  const updateTrainingMetadata = (patch: Partial<NonNullable<PhysicalFixtureAnnotations['trainingMetadata']>>) => {
    if (!draft) return
    const base = draft.trainingMetadata ?? { imageId: draft.fixtureId, sourceType: 'real-photo' as const, orientation: draft.image.height >= draft.image.width ? 'portrait' as const : 'landscape' as const, reviewStatus: 'draft' as const }
    const metadata={...base,...patch,annotationStartedAt:base.annotationStartedAt??new Date().toISOString(),...(patch.reviewStatus==='locked'?{annotationCompletedAt:new Date().toISOString()}:{})}
    const next={...draft,trainingMetadata:metadata}
    if(patch.reviewStatus==='locked'&&validatePhysicalAnnotations(next,fixture?.expectedRows??[]).issues.some(issue=>issue.severity==='error')){alert('Resolve all validation errors before locking this fixture.');return}
    commit(next)
  }
  const deleteSelected = () => { if (draft && selectedId) { commit({ ...draft, regions: draft.regions.filter((region) => region.id !== selectedId) }); setSelectedId(null) } }
  const undo = () => { const previous = history.at(-1); if (previous && draft) { setFuture((items) => [clone(draft), ...items]); setDraft(previous); setHistory((items) => items.slice(0, -1)) } }
  const redo = () => { const next = future[0]; if (next && draft) { setHistory((items) => [...items, clone(draft)]); setDraft(next); setFuture((items) => items.slice(1)) } }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo() }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo() }
      else if (event.key === 'Delete') deleteSelected()
      else if (event.key === 'Escape') { setSelectedId(null); setDrawing(null); setEditing(null); setPreview(null); setQuadMode(false); setQuadPoints([]); setQuadTargetId(null) }
      else if (event.key === '+') setZoom((value) => Math.min(4, value + 0.25))
      else if (event.key === '-') setZoom((value) => Math.max(0.5, value - 0.25))
      else if (event.key.toLowerCase() === 'f') setZoom(1)
    }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  })

  const chooseCard = (card: CardReference) => { updateSelected({ exactPrintReferenceId: card.id, exactPrintKey: card.exactPrintKey, cardName: card.englishName, setCode: card.setCode, collectorNumber: card.cardNumber, regulationMark: card.regulationMark, unresolved: false }); setSearch(''); setCardResults([]) }
  const importAnnotations = async (file: File) => { const value = JSON.parse(await file.text()) as PhysicalFixtureAnnotations; if (value.schemaVersion !== PHYSICAL_ANNOTATION_SCHEMA_VERSION) return alert('Unsupported annotation schema.'); if (value.image.width !== fixture?.width || value.image.height !== fixture?.height) if (!confirm('Image dimensions differ. Import anyway?')) return; setDraft(value) }
  const importDetector = async (file: File) => {
    const report = JSON.parse(await file.text()); const result = report.results?.find((item: { fixture: string }) => item.fixture === fixtureId); if (!result) return alert('Fixture not found in detector report.')
    setDetectorRegions((result.diagnostics?.debugMatches ?? []).map((match: { candidateId: string; candidateBounds: { x: number; y: number; width: number; height: number } }) => ({ id: match.candidateId, bounds: { x: match.candidateBounds.x / fixture!.width, y: match.candidateBounds.y / fixture!.height, width: match.candidateBounds.width / fixture!.width, height: match.candidateBounds.height / fixture!.height } })))
  }
  const exportAnnotations = () => {
    if (validation?.status !== 'valid' && !confirm('This annotation is incomplete or invalid. Export the draft anyway?')) return
    download(`${fixture!.id}.physical-annotations.json`, draft)
  }
  const exportPreview = () => {
    if (!draft || !fixture) return
    const current=draft
    if(validatePhysicalAnnotations(current,fixture.expectedRows).issues.some(issue=>issue.severity==='error')){alert('Resolve validation errors before exporting a dataset preview.');return}
    download(`${fixture.id}.localization-preview.json`, {image:{id:current.trainingMetadata?.imageId??current.fixtureId,width:current.image.width,height:current.image.height,sourceType:current.trainingMetadata?.sourceType??'real-photo'},annotations:current.regions.filter(region=>!region.training?.ignoreForTraining).map(region=>({id:region.id,category:'logical-stack',bbox:[region.normalizedBounds.x*current.image.width,region.normalizedBounds.y*current.image.height,region.normalizedBounds.width*current.image.width,region.normalizedBounds.height*current.image.height],difficult:region.training?.difficult??false,reviewStatus:region.training?.reviewStatus??'draft'}))})
  }

  if (!catalog || !fixture || !draft) return <main className="p-8">Loading physical fixtures…</main>
  const validationResult = validation!
  return <main className="min-h-dvh bg-[var(--surface-base)] p-4 text-[var(--text-primary)]">
    <header className="mx-auto mb-4 max-w-[1800px]"><h1 className="text-2xl font-bold">Physical Deck Fixture Annotator</h1><p className="text-sm text-[var(--text-muted)]">Local developer tool. Draw human ground truth only; detector boxes are comparison-only.</p></header>
    <div className="mx-auto grid max-w-[1800px] gap-4 xl:grid-cols-[300px_minmax(500px,1fr)_360px]">
      <Panel className="space-y-4">
        <div><FieldLabel>Fixture</FieldLabel><SelectField value={fixtureId} onChange={(event) => setFixtureId(event.target.value)}>{catalog.fixtures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField></div>
        <p className="text-sm">{fixture.imageFile} · {fixture.width}×{fixture.height}<br/>{fixture.expectedRows.length} expected rows · 60 cards</p>
        <label className="block text-sm">Import annotation JSON<input className="mt-1 block w-full text-xs" type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && importAnnotations(event.target.files[0])}/></label>
        <label className="block text-sm">Import detector report<input className="mt-1 block w-full text-xs" type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && importDetector(event.target.files[0])}/></label>
        <div className="grid grid-cols-2 gap-2"><Button onClick={undo} disabled={!history.length}>Undo</Button><Button onClick={redo} disabled={!future.length}>Redo</Button><Button onClick={() => setZoom((z) => Math.min(4,z+.25))}>Zoom +</Button><Button onClick={() => setZoom((z) => Math.max(.5,z-.25))}>Zoom −</Button><Button onClick={() => setZoom(1)}>Fit</Button><Button onClick={() => { setQuadMode(false); setQuadPoints([]); setQuadTargetId(null); setTopCardMode((v) => !v) }} disabled={!selected}>{topCardMode ? 'Cancel top-card crop' : 'Top-card crop'}</Button><Button onClick={() => { setTopCardMode(false); setQuadPoints([]); setQuadTargetId(null); setQuadMode((value) => !value) }}>{quadMode ? `Cancel corners (${quadPoints.length}/4)` : '4-corner crop'}</Button></div>
        <label><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)}/> Labels</label> <label><input type="checkbox" checked={showDetector} onChange={(event) => setShowDetector(event.target.checked)}/> Detector</label><br/><label><input type="checkbox" checked={hideAnnotations} onChange={(event) => setHideAnnotations(event.target.checked)}/> Hide existing annotation overlays</label>
        <div className="rounded-xl border p-3 text-sm"><strong>{validationResult.status.toUpperCase()}</strong><br/>Logical regions: {draft.regions.length}/{fixture.expectedRows.length}<br/>Reviewed regions: {draft.regions.filter(region=>['reviewed','locked'].includes(region.training?.reviewStatus??'')).length}/{draft.regions.length}<br/>Annotated cards: {validationResult.total}/60<br/>Checklist complete: {validationResult.checklist.filter((row) => row.status === 'complete').length}/{validationResult.checklist.length}<br/>Errors: {validationResult.issues.filter((issue) => issue.severity === 'error').length}<br/>Warnings: {validationResult.issues.filter((issue) => issue.severity === 'warning').length}<br/>Last local save: {savedAt || 'pending'}</div>
        <div className="space-y-2 rounded-xl border p-3 text-sm"><strong>Training metadata</strong><TextInput aria-label="Image ID" placeholder="Image ID" value={draft.trainingMetadata?.imageId??''} onChange={event=>updateTrainingMetadata({imageId:event.target.value})}/><TextInput aria-label="Capture session" placeholder="Capture session" value={draft.trainingMetadata?.captureSessionId??''} onChange={event=>updateTrainingMetadata({captureSessionId:event.target.value})}/><TextInput aria-label="Deck ID" placeholder="Deck ID" value={draft.trainingMetadata?.deckId??''} onChange={event=>updateTrainingMetadata({deckId:event.target.value})}/><TextInput aria-label="Device class" placeholder="Device class" value={draft.trainingMetadata?.deviceClass??''} onChange={event=>updateTrainingMetadata({deviceClass:event.target.value})}/><TextInput aria-label="Reviewer" placeholder="Reviewer" value={draft.trainingMetadata?.reviewedBy??''} onChange={event=>updateTrainingMetadata({reviewedBy:event.target.value})}/><div><FieldLabel>Review minutes</FieldLabel><NumberInput min={0} value={draft.trainingMetadata?.reviewMinutes??0} onChange={event=>updateTrainingMetadata({reviewMinutes:Number(event.target.value)})}/></div><div><FieldLabel>Fixture review</FieldLabel><SelectField value={draft.trainingMetadata?.reviewStatus??'draft'} onChange={event=>updateTrainingMetadata({reviewStatus:event.target.value as 'draft'|'reviewed'|'locked'})}>{['draft','reviewed','locked'].map(value=><option key={value}>{value}</option>)}</SelectField></div><TextareaField aria-label="Image quality notes" placeholder="Image quality notes" value={draft.trainingMetadata?.qualityNotes??''} onChange={event=>updateTrainingMetadata({qualityNotes:event.target.value})}/></div>
        <div className="text-xs">Detector: {metrics.matchedRegions} match · {metrics.missedRegions} miss · {metrics.falseRegions} false · {metrics.duplicateRegions} duplicate · recall {(metrics.recall*100).toFixed(1)}%</div>
        <Button onClick={exportAnnotations}>Export JSON</Button>
        <Button onClick={exportPreview}>Dataset export preview</Button>
        <Button tone="danger" onClick={() => { if(confirm('Clear this local draft?')) { clearAnnotationDraft(fixture.id, fixture.width, fixture.height); location.reload() }}}>Clear draft</Button>
      </Panel>
      <Panel className="overflow-auto p-2">
        <div style={{ width: `${zoom*100}%` }} className="relative mx-auto select-none touch-none" ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>
          {/* Generated local copies make test-data fixtures available to the static export. */}<img src={fixture.imageUrl} alt={`${fixture.name} physical fixture`} draggable={false} className="block h-auto w-full"/>
          {!hideAnnotations && draft.regions.map((region) => { const bounds = editing?.id === region.id ? editing.current : region.normalizedBounds; return <button type="button" key={region.id} onPointerDown={(event) => beginEdit(event, region, 'move')} className={`absolute border-2 ${selectedId === region.id ? 'border-yellow-300 bg-yellow-300/15' : 'border-emerald-400 bg-emerald-400/10'}`} style={{ pointerEvents:quadMode?'none':'auto', left:`${bounds.x*100}%`, top:`${bounds.y*100}%`, width:`${bounds.width*100}%`, height:`${bounds.height*100}%` }}>{showLabels && <span className="absolute left-0 top-0 bg-black/80 px-1 text-[10px] text-white">GT {region.cardName || 'unresolved'} Q={region.quantity}</span>}{region.topCardBounds && <span className="absolute border border-cyan-300" style={{ left:`${((region.topCardBounds.x-region.normalizedBounds.x)/region.normalizedBounds.width)*100}%`, top:`${((region.topCardBounds.y-region.normalizedBounds.y)/region.normalizedBounds.height)*100}%`, width:`${(region.topCardBounds.width/region.normalizedBounds.width)*100}%`, height:`${(region.topCardBounds.height/region.normalizedBounds.height)*100}%` }}/>} {region.topCardQuad && <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points={region.topCardQuad.map((item)=>`${((item.x-region.normalizedBounds.x)/region.normalizedBounds.width)*100},${((item.y-region.normalizedBounds.y)/region.normalizedBounds.height)*100}`).join(' ')} fill="rgba(34,211,238,.12)" stroke="rgb(34,211,238)" strokeWidth="1" vectorEffect="non-scaling-stroke"/></svg>} {selectedId === region.id && <span aria-label="Resize region" onPointerDown={(event) => beginEdit(event, region, 'resize')} className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-sm border border-black bg-yellow-300"/>}</button> })}
          {quadMode && quadPoints.length > 0 && <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={quadPoints.map((item)=>`${item.x*100},${item.y*100}`).join(' ')} fill="none" stroke="rgb(34,211,238)" strokeWidth="1" vectorEffect="non-scaling-stroke"/>{quadPoints.map((item,index)=><circle key={index} cx={item.x*100} cy={item.y*100} r=".7" fill="rgb(34,211,238)"/>)}</svg>}
          {showDetector && detectorRegions.map((region) => <div key={region.id} className="pointer-events-none absolute border-2 border-dashed border-fuchsia-400" style={{left:`${region.bounds.x*100}%`,top:`${region.bounds.y*100}%`,width:`${region.bounds.width*100}%`,height:`${region.bounds.height*100}%`}}>{showLabels&&<span className="bg-fuchsia-900 px-1 text-[10px] text-white">DET</span>}</div>)}
          {preview && <div className="pointer-events-none absolute border-2 border-sky-300 bg-sky-300/10" style={{left:`${preview.x*100}%`,top:`${preview.y*100}%`,width:`${preview.width*100}%`,height:`${preview.height*100}%`}}/>}
        </div>
      </Panel>
      <Panel className="space-y-3">
        {!selected ? <p>Select or draw a region. Draw one box around each logical stack; use separate quantity-one boxes for individually laid copies.</p> : <>
          <div className="flex justify-between"><strong>Selected region</strong><Button tone="danger" onClick={deleteSelected}>Delete</Button></div>
          <div><FieldLabel>Card search</FieldLabel><TextInput value={search} onChange={(event) => { const value=event.target.value; setSearch(value); setCardResults(value.length>1?searchRepositoryCardsByNormalizedName(value).slice(0,12):[]) }}/>{cardResults.length>0&&<div className="max-h-52 overflow-auto border">{cardResults.map((card)=><button className="flex w-full gap-2 border-b p-2 text-left text-xs" key={card.id} onClick={()=>chooseCard(card)}>{card.imageSmall&&<img src={card.imageSmall} alt="" className="h-12 w-9 object-cover"/>}<span>{card.englishName}<br/>{card.setCode} {card.cardNumber} · {card.regulationMark ?? '—'}</span></button>)}</div>}</div>
          <div><FieldLabel>Manual card name</FieldLabel><TextInput value={selected.cardName} onChange={(event)=>updateSelected({cardName:event.target.value,unresolved:!event.target.value})}/></div>
          <div className="grid grid-cols-2 gap-2"><TextInput aria-label="Set code" placeholder="Set" value={selected.setCode??''} onChange={(event)=>updateSelected({setCode:event.target.value})}/><TextInput aria-label="Collector number" placeholder="Number" value={selected.collectorNumber??''} onChange={(event)=>updateSelected({collectorNumber:event.target.value})}/></div>
          <div><FieldLabel>Quantity</FieldLabel><NumberInput min={1} value={selected.quantity} onChange={(event)=>updateSelected({quantity:Number(event.target.value)})}/></div>
          <div><FieldLabel>Presentation</FieldLabel><SelectField value={selected.presentation} onChange={(event)=>{const presentation=event.target.value as PhysicalRegionAnnotation['presentation'];updateSelected(presentation==='offset-stack'?{presentation,stack:{offsetDirection:selected.stack?.offsetDirection??'other',exposedEdgeCount:selected.stack?.exposedEdgeCount??Math.max(1,selected.quantity-1)}}:{presentation})}}>{['single','offset-stack','individual-copies','mixed','unknown'].map((value)=><option key={value} value={value}>{value}</option>)}</SelectField></div>
          {selected.presentation === 'offset-stack' && <div className="grid grid-cols-2 gap-2 rounded-xl border p-2">
            <div><FieldLabel>Offset direction</FieldLabel><SelectField value={selected.stack?.offsetDirection ?? 'other'} onChange={(event)=>updateSelected({stack:{...selected.stack,offsetDirection:event.target.value as NonNullable<PhysicalRegionAnnotation['stack']>['offsetDirection']}})}>{['down','right','down-right','left','up','other'].map((value)=><option key={value} value={value}>{value}</option>)}</SelectField></div>
            <div><FieldLabel>Exposed lower-card edges</FieldLabel><NumberInput min={1} value={selected.stack?.exposedEdgeCount ?? Math.max(1,selected.quantity-1)} onChange={(event)=>updateSelected({stack:{...selected.stack,exposedEdgeCount:Number(event.target.value)}})}/></div>
          </div>}
          <label><input type="checkbox" checked={selected.unresolved??false} onChange={(event)=>updateSelected({unresolved:event.target.checked})}/> Explicitly unresolved</label>
          <div className="space-y-2 rounded-xl border p-2"><div><FieldLabel>Training review</FieldLabel><SelectField value={selected.training?.reviewStatus??'draft'} onChange={event=>updateSelected({training:{...selected.training,reviewStatus:event.target.value as 'draft'|'reviewed'|'locked'}})}>{['draft','reviewed','locked'].map(value=><option key={value}>{value}</option>)}</SelectField></div><label><input type="checkbox" checked={selected.training?.difficult??false} onChange={event=>updateSelected({training:{...selected.training,difficult:event.target.checked}})}/> Difficult region</label><br/><label><input type="checkbox" checked={selected.training?.ignoreForTraining??false} onChange={event=>updateSelected({training:{...selected.training,ignoreForTraining:event.target.checked}})}/> Ignore for training</label></div>
          <div><FieldLabel>Notes</FieldLabel><TextareaField value={selected.notes??''} onChange={(event)=>updateSelected({notes:event.target.value})}/></div>
          <div className="text-xs">Bounds: {Object.values(clampNormalizedBounds(selected.normalizedBounds)).map((value)=>value.toFixed(4)).join(', ')}<br/>Reference: {selected.exactPrintReferenceId ?? 'missing'}<br/>Top-card crop: {selected.topCardBounds?'set':'missing'} · Four corners: {selected.topCardQuad?'set':'missing'}</div>
        </>}
        <div className="border-t pt-3"><strong>Exact-list checklist</strong><div className="mt-2 max-h-72 overflow-auto text-xs">{validationResult.checklist.map((row)=><div key={`${row.name}-${row.setCode}-${row.collectorNumber}`} className="flex justify-between border-b py-1"><span>{row.name} {row.setCode} {row.collectorNumber}</span><span>{row.annotatedQuantity}/{row.quantity} {row.status}</span></div>)}</div></div>
        <details><summary>Instructions & shortcuts</summary><ol className="list-decimal pl-5 text-xs"><li>Draw one box around each logical stack.</li><li>Use quantity 1 for separate individual copies.</li><li>Select the exact print, then enter quantity and presentation.</li><li>For a rotated card, choose 4-corner crop and click top-left, top-right, bottom-right, bottom-left.</li><li>Resolve checklist mismatches and total 60.</li><li>Export JSON to the fixture directory.</li></ol><p className="mt-2 text-xs">Delete · Esc/cancel · Ctrl+Z/Y · +/- zoom · F fit</p></details>
      </Panel>
    </div>
  </main>
}
