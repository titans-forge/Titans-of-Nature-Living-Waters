import { useEffect, useRef, useState } from 'react';

/** Practice has no journey update callback: it cannot award progress or erase mistakes. */
export function ControlCoach({ paused, onContinue, onAssist }: { paused: boolean; onContinue: () => void; onAssist: () => void }) {
  const [practice, setPractice] = useState(false);
  const [held, setHeld] = useState(false);
  const [lesson, setLesson] = useState<'hold' | 'release' | 'done'>('hold');
  const [message, setMessage] = useState('Press and keep holding until the cue changes.');
  const pointer = useRef<number | null>(null);
  const heldRef = useRef(false);
  const started = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (practice) button.current?.focus(); else heading.current?.focus(); }, [practice]);
  useEffect(() => {
    if (!held || paused) return;
    const timer = window.setTimeout(() => { setLesson('release'); setMessage('Let go now. Releasing is the next action.'); }, 700);
    return () => window.clearTimeout(timer);
  }, [held, paused]);
  useEffect(() => { if (paused) { pointer.current = null; heldRef.current = false; setHeld(false); setLesson('hold'); setMessage('Practice paused. Try again when the expedition resumes.'); } }, [paused]);
  const press = () => { if (paused || heldRef.current || lesson === 'done') return; started.current = performance.now(); heldRef.current = true; setHeld(true); setLesson('hold'); setMessage('Keep holding…'); };
  const release = () => {
    pointer.current = null;
    if (!heldRef.current) return;
    heldRef.current = false;
    setHeld(false);
    if (performance.now() - started.current >= 700) { setLesson('done'); setMessage('That was a hold followed by a release. On the water, follow the current cue.'); }
    else { setLesson('hold'); setMessage('That was a tap. Try keeping the button pressed until “Let go now.”'); }
  };
  const cancel = () => {
    pointer.current = null;
    if (!heldRef.current) return;
    heldRef.current = false; setHeld(false); setLesson('hold');
    setMessage('The input was interrupted. Try a hold followed by letting go on this control.');
  };
  return <section className="control-coach" aria-label="Control coaching">
    <div className="interaction-reading">
      <small>Encounter paused · your progress is preserved</small>
      <h1 ref={heading} tabIndex={-1}>{practice ? 'Try a hold and release.' : 'The crew can help.'}</h1>
      <p>{practice ? 'This practice leaves your catch, attempt and journal untouched.' : 'Several response windows passed without progress. HOLD means keeping the control pressed; RELEASE means letting go. You can practice or let the crew apply each response at your pace.'}</p>
      {practice && <p className="control-coach__lesson" role="status">{lesson === 'release' ? 'Let go now' : lesson === 'done' ? 'Practice complete' : 'Hold the practice control'}<span>{message}</span></p>}
    </div>
    <div className="interaction-actions control-coach__actions">
      {practice ? <><button ref={button} className="interaction-control" disabled={paused || lesson === 'done'} aria-pressed={held}
        onPointerDown={event => { if (!event.isPrimary || event.button !== 0 || pointer.current !== null) return; event.preventDefault(); pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); press(); }}
        onPointerUp={event => { if (pointer.current !== event.pointerId) return; release(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
        onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) press(); } }}
        onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); release(); } }}>
        <span>{lesson === 'done' ? 'HOLD AND RELEASE COMPLETE' : 'HOLD PRACTICE'}</span><small>Hold Space/Enter or the pointer, then let go.</small>
      </button><button className="secondary" disabled={paused} onClick={() => { setHeld(false); setPractice(false); }}>Return to the encounter</button></>
        : <><button className="secondary" disabled={paused} onClick={() => { setLesson('hold'); setPractice(true); }}>Practice hold and release</button>
          <button className="primary" disabled={paused} onClick={onContinue}>Continue timed</button>
          <button className="secondary" disabled={paused} onClick={onAssist}>Use untimed crew</button></>}
    </div>
  </section>;
}
