import { useRef, useState } from 'react';
import { venueById } from '../data/venues';
import { createInitialState } from '../game/engine';
import { MAX_SAVE_BYTES, parseExpedition, serializeExpedition } from '../game/save';
import type { ExpeditionState } from '../types';

export function downloadExpeditionRaw(raw: string, filename = 'living-waters-recovery.json') {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  try {
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
  } finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
export function CampaignTransfer({ state, onImport, recoveryRaw }: {
  state: ExpeditionState;
  onImport: (state: ExpeditionState, notice?: string) => void;
  recoveryRaw?: string | null;
}) {
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{ state: ExpeditionState; warnings: string[]; filename: string; newJourney?: boolean } | null>(null);
  const readNumber = useRef(0);
  const exportCurrent = () => {
    try { downloadExpeditionRaw(serializeExpedition(state), 'living-waters-journey.json'); setNotice('Journey exported. Keep the file to restore progress in another browser.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Export failed. The current journey is unchanged.'); }
  };
  const read = async (file: File | undefined) => {
    const currentRead = ++readNumber.current; setPreview(null);
    if (!file) return;
    if (file.size > MAX_SAVE_BYTES) { setNotice('That file exceeds the 4 MiB save limit.'); return; }
    try {
      const parsed = parseExpedition(await file.text());
      if (currentRead !== readNumber.current) return;
      if (!parsed.ok) { setNotice(parsed.error); return; }
      setPreview({ state: parsed.state, warnings: parsed.warnings, filename: file.name });
      setNotice('File checked. Review the journey below before replacing your current progress.');
    } catch { if (currentRead === readNumber.current) setNotice('The file could not be read. Your current journey is unchanged.'); }
  };
  return <section className="campaign-transfer" aria-label="Save and restore journey">
    <h3>Keep your journey</h3>
    <p>Export a portable copy, or restore one you saved earlier. Import replaces the current journey after confirmation.</p>
    <div className="transfer-actions"><button onClick={exportCurrent}>Export journey</button><button onClick={() => { readNumber.current += 1; setPreview({ state: createInitialState(), warnings: [], filename: "New empty journey", newJourney: true }); setNotice("Export your current journey first. Starting over requires confirmation below."); }}>Start a new journey</button><label>Choose save file<input type="file" accept="application/json,.json" onChange={event => { void read(event.target.files?.[0]); event.target.value = ''; }} /></label>
      {recoveryRaw != null && <button onClick={() => { try { downloadExpeditionRaw(recoveryRaw); setNotice('Recovery copy exported. Keep it alongside your current journey.'); } catch { setNotice('Recovery export failed. The stored original remains unchanged.'); } }}>Export recovery copy</button>}
    </div>
    {preview && <div className="transfer-preview" role="region" aria-label="Imported journey preview"><h4>{preview.newJourney ? "Start a new journey?" : "Restore this journey?"}</h4><p>{preview.filename}</p><p>{preview.state.venueId ? venueById[preview.state.venueId].title : 'Destination selection'} · {preview.state.stage} · {preview.state.journalIds.length} discoveries · {preview.state.completedAssignmentIds.length} completed assignments</p><p>{preview.state.observations.length} detailed observations · {preview.state.learningAnswers.length} learning answers</p>{preview.warnings.map(warning => <p key={warning}>{warning}</p>)}<p>This replaces the active expedition and journal. Export your current journey first if you want to keep a separate copy.</p><button onClick={() => { const selected = preview; setPreview(null); onImport(selected.state, selected.warnings.join(' ')); }}>{preview.newJourney ? "Confirm new journey" : "Replace current journey"}</button><button onClick={() => { readNumber.current += 1; setPreview(null); setNotice('Import cancelled. Your current journey is unchanged.'); }}>Cancel import</button></div>}
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}
