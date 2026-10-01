# Release Fidelity and QA

Last verified: August 30, 2026.

## Design fidelity

| Area | Release implementation | Result |
|---|---|---|
| Habitat priority | Full-bleed regional scenes remain the dominant play surface | Pass |
| Information hierarchy | Compact kit and guide rails support rather than obscure the habitat | Pass |
| Field decisions | Questions, gear, water, casting, control, handling, and reporting form one readable chain | Pass |
| Modes | Guided exposes route leads; Field preserves the same objective without revealing the route | Pass |
| Accessibility | Keyboard focus, reduced-motion detection, untimed controls, and a focus-managed journal dialog are present | Pass |
| Responsive behavior | Desktop and portrait mobile layouts preserve all required actions | Pass |

## Mechanical acceptance

- Fifteen selectable destinations with search and seasonal return states.
- Three casts per field trip with gear and habitat changes between attempts.
- Encounter-specific burst, aerial, bottom, steady, and passive interaction profiles.
- Safe and unsafe handling outcomes with journal and assignment consequences.
- Twenty-two featured catches with species-specific reveal art; non-featured species retain the standard field record.
- Versioned local save migration, destination progress, assignment completion, and ecosystem comparisons.
- Authority source links and factual-limit notes available from discovered journal subjects.

## Automated evidence

`npm run check` is the release gate. It executes:

- 47 deterministic unit and validation tests;
- TypeScript checking;
- the production Vite build;
- a desktop Chromium expedition through clean assisted play, safe release, save/resume, journal keyboard handling, and final reporting; and
- a mobile Chromium check for search, Field mode, hidden route answers, and horizontal overflow.

## Manual browser evidence

- Automated Chromium verification passed at desktop and portrait-mobile viewports.
- Destination-to-arrival transitions reset to the top of the next stage.
- No horizontal overflow, failed images, console warnings, or console errors.
- Arrival, destination, interaction, and journal controls remain visible or reachable by normal scrolling.

## Media provenance

Code, catch reconstructions, habitat panoramas, and guide portraits now have documented status. The owner confirmation is retained in `docs/MEDIA_PROVENANCE_RECORD.md`.
