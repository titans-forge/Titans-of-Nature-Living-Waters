# Living Waters 1.1.0: local verification

Verified September 7, 2026 (America/New_York). This is a local research edition, not a public release or a learner-validated product.

## What changed

Three comparative research journeys connect six of the fifteen destinations. Thirty-three authored prediction, reflection, and comparison questions retain first answers; uncertainty and wrong answers receive explanations without permanently blocking a research report. Twenty-four glossary terms support reading. The existing fifteen-destination exploration remains open.

Detailed observations retain season, habitat, equipment, handling, placement, control mistakes, use of assistance, and sharing. Participation points no longer masquerade as mastery. Repeated catches retain useful records without repeating the same awards. Current-trip completion is separate from historical assignment completion.

The actual timed control loop now rewards its taught rhythm. Pressure feedback uses each encounter's limits. Safe handling and sharing make evidence eligible for research journeys. Baikal camera/hooked-method mismatches were repaired, and incidental Alaska rockfish encounters close that station for the rest of the trip.

Version 8 saves have strict validation, conservative known-version migration, recovery backups, guarded storage, portable export, and import preview/confirmation. Browsing the atlas preserves the current trip. The journal pauses timers and traps focus correctly. Hidden pages and restored casts wait for explicit resume. Larger text applies at startup; optional synthesized ambience survives closing the journal. Mobile retains the kit name, guide, habitat names, and conditions. Offscreen destination art is lazy-loaded; the ecosystem web loads on demand.

## Automated checks

- 126 tests pass across engine, timed control, observations, content/learning, save parsing, and storage.
- 1,188 taught-control cases: all 396 safe season/habitat/equipment routes at ideal, near, and wide placement. All finish with zero mistakes and appropriate technique credit.
- The same control policy previously produced zero mistakes in only 979 of those 1,188 cases. All 396 routes still complete with continuous holding, but it earns lower technique quality and credit.
- A further 396 cases allow two UI ticks (340 ms) of delayed response at phase changes without mistakes. This is a deterministic tolerance check, not a human reaction-time study.
- All 78 assignments remain reachable. All 27 Baikal equipment/season/habitat combinations satisfy equipment compatibility. Alaska closure, duplicate rewards, assistance tracking, and historical-versus-current report completion have regressions.
- 52 save/storage tests cover validation, known legacy-shaped fixtures, preserved raw data, quota/unavailable storage, replacements, and native observation routes. Unknown historical variants are preserved and rejected rather than guessed; no real historical player files were supplied.
- TypeScript checking, production bundling, and local ZIP packaging pass. `index.html` is at the archive root.

## Browser play and inspection

The Codex in-app browser was used for an actual Amazon Guided expedition and Tonle Sap Field expedition, including questions, preparation, predictions, handling, reflection, sharing, and the first cross-world research report. The Tonle Sap prediction used “not sure yet”; the research conclusion deliberately used a wrong answer. Both retained their first-answer record and constructive feedback while allowing continued play.

Desktop and 390-pixel mobile checks covered visible habitat labels/kit/conditions, no horizontal overflow, journal focus wrapping, paused timed progress, restored-cast pausing, destination confirmation/cancellation/resume, source-journal context, larger-text persistence, ambience setting persistence, actual export, malformed-file rejection, import preview/cancellation, and confirmed restoration into the production build. Exported observations matched the two played encounters and their actual technique/assistance fields.

During verification, rebuilding files under an already-open static test page caused one stale dynamic-module URL to fail. The recovery boundary preserved the save; a fresh navigation to the final build loaded the current module and current-destination sources successfully. Installation retains older built assets instead of deleting them. This was not counted as a clean pass until the frozen production files were rechecked.

The repository's Playwright scenario was updated for the prediction/reflection flow. The Playwright CLI suite was not executed in this session; browser verification used the authorized in-app browser runtime instead. No Safari, Firefox, screen-reader session, real touchscreen device, or learner study is claimed.

## Remaining validation

Use `LEARNER_PLAYTEST.md` for the next test round. The game needs evidence about comprehension, delayed retention, ease of control, desire to replay, age suitability, and reading burden. Species-specific motion/audio, more branching community outcomes, and richer repeat-visit decisions remain opportunities. Automated coverage does not establish educational effectiveness, production-grade accessibility, or a 10/10 experience.

No upload, push, tag, deployment, or public release was performed.
