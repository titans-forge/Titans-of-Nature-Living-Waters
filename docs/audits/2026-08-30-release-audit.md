# Living Waters Release Audit

Date: 2026-08-30

## Verdict

Living Waters is a strong release candidate with an unusually coherent educational loop. The visual presentation, breadth of destinations, ecological decision chain, catch reconstructions, deterministic engine, local save, and offline package are all in good shape.

Current product grade after remediation: **A-**

Original audit grade before remediation: **B+**

Public release status: **Ready for publication; repository remote and itch.io upload remain operational steps.**

## Post-Audit Remediation

The following work was completed after the findings below were recorded:

- Untimed play now resolves every assisted phase inside the encounter's controlled pressure range, preserves genuine prior mistakes, and awards fieldcraft without manufacturing assist penalties.
- Cast placement now changes opening line pressure: accurate placement produces a calmer start, a workable cast preserves baseline pressure, and a wide cast adds recoverable pressure without changing the target encounter.
- The ecosystem journal now has dialog semantics, initial focus, a focus trap, Escape close, scroll locking, and focus restoration.
- The missing gold design token is defined.
- Tonle Sap turtle guidance is narrowed to supported handling principles, explicitly defers to Cambodian rules and trained local response, and carries a three-source authority trail.
- Content validation rejects short source notes and unresolved review language.
- Desktop browser coverage now reaches clean assisted completion, safe handling, save/resume, journal keyboard behavior, and a completed community report.
- Final evidence: 47 unit/content tests and 2 browser tests passed; two consecutive builds produced the same 55-file archive SHA-256: `b35fdc3e4e7bd100d617949bbf9388f5da71c5dab3dd567e86ac1d56ff1b1da5`.

The project owner completed `docs/MEDIA_PROVENANCE_RECORD.md` for habitat panoramas and guide portraits on August 30, 2026. The original findings are retained below as the audit trail.

## Evidence Run

- Clean install: passed (`npm ci`, 0 vulnerabilities).
- Deterministic tests: 46/46 passed.
- TypeScript and production build: passed.
- Playwright: desktop and portrait-mobile checks passed.
- Current itch archive: 55 files, 10,630,550 bytes unpacked.
- ZIP entry point: `index.html` is at the archive root.
- Current SHA-256: `3bb955af3b534c71a34a44271a78a691d15d29a1589010e72ac13b8949d51d1e`.
- Manual playthrough: Amazon arrival through questions, gear, habitat, untimed cast, Peacock bass handling, journal, ecosystem web, and community debrief.
- Mobile measurement at 390 x 844: no horizontal overflow; 15 destination cards rendered.

## Product Grades

| Area | Grade | Assessment |
|---|---:|---|
| Core expedition loop | A- | Questions, kit, habitat, cast, handling, and reporting form one understandable chain. |
| Visual design | A- | Habitat panoramas and catch reveals provide a clear sense of place and occasion. |
| Educational value | A- | The game teaches habitat relationships and field judgment rather than isolated fish trivia. |
| Fishing skill | B | Timing and hold/release are readable, but cast accuracy has limited effect on the encounter and the untimed route currently misgrades correct play. |
| Accessibility | B | Keyboard controls, reduced motion, focus styles, and untimed input exist; the assist scoring and journal-dialog semantics need correction. |
| Content evidence | B+ | Every venue has an authority link and factual-limit note, but some handling/species claims need more specific support. |
| Technical readiness | A- | Deterministic, offline, tested, compact, and dependency-clean. UI coverage is still narrower than the content surface. |
| Release/legal readiness | C | Habitat and guide generation records remain unresolved, and the repository has no initial commit. |

## Priority 1: Fix Before Release

### 1. Untimed controls penalize correct assisted play

Following every assisted instruction produced a completed Peacock bass catch labeled **Developing**, with the line left **Strained**. The assist function correctly holds only during rest phases, but line pressure can drift outside the safe range during a required run and accrue mistakes. The current test verifies completion but does not assert zero assist-mode mistakes.

Fix: make each assisted phase resolve to a controlled pressure state, or suppress strain penalties caused solely by the automated phase duration. Add assertions for zero mistakes and a Clean result across aerial, bottom, steady, and passive profiles.

Relevant code: `src/game/engine.ts:126-176`, `tests/engine.test.ts:172-177`.

### 2. Complete the media provenance record

`MEDIA_RIGHTS.md` still says the provider, generating account, generation date, and applicable terms are required for all habitat panoramas and guide portraits. This is an explicit stop gate in `docs/RELEASE_CHECKLIST.md`.

Fix: add the owner-held provider record, confirm redistribution authorization, and update the release status. Do not publish the complete media bundle until this is resolved.

### 3. Replace the pending Tonle Sap turtle-handling note

The Tonle Sap question still says its advice is pending Cambodia-specific handling review. General conservative advice is reasonable, but unresolved review language should not ship inside a game presenting reviewed field guidance.

Fix: cite an appropriate Cambodian/Mekong wildlife or fisheries authority, narrow the claim to what that source supports, or remove the handling prompt from the release build.

Relevant code: `src/data/tonleSap.ts:7`.

### 4. Create the repository baseline

The project has no commits; the entire tree is untracked. The itch ZIP is valid, but a public open-source release needs a reviewable first commit and tag.

Fix: review the generated audit artifacts, make the initial commit, push to the intended Titans Forge repository, and tag the exact tested tree as `v1.0.0`.

### 5. Refresh stale release evidence

`docs/RELEASE_STATUS.md` and `docs/FIDELITY_QA.md` still identify August 21 as the last verification date. The release-status file also records the superseded SHA-256 `2aa7a4...`, while the archive generated by this audit is `3bb955...`.

Fix: update the release status only after the pre-release fixes are complete and a final archive is generated. Record that final archive's checksum rather than today's interim value.

## Priority 2: High-Value Polish

### 6. Make cast accuracy matter modestly

Cast timing currently changes score, while habitat plus gear determines nearly every encounter. Only the special overcast route uses power directly. This makes the meter look more consequential than it is.

Fix: keep the forgiving model, but let accurate placement influence encounter selection, first-fight pressure, or observation quality within a narrow range. A wide cast should never end the trip, but the result should be visibly different.

Relevant code: `src/game/engine.ts:103-117`.

### 7. Strengthen modal keyboard behavior

The ecosystem journal has a close button and scrim, but no dialog semantics, focus trap, focus return, or Escape behavior.

Fix: add `role="dialog"`, `aria-modal="true"`, an accessible title, initial focus, Escape close, and focus restoration.

Relevant code: `src/App.tsx:165-166`.

### 8. Broaden release-path testing

The two E2E tests cover one full Amazon route and a Galapagos mobile arrival. They do not exercise debrief completion, save migration, Field-mode completion, the ecosystem journal, all fight families in the browser, or representative passive/protected-species routes.

Fix: add a compact matrix for one active fish, one passive survey, one protected-species encounter, debrief completion, save/resume, journal open/close, and one mobile handling screen.

### 9. Repair the undefined gold design token

The cast target and technique-summary accent use `var(--gold)`, but the root palette does not define `--gold`. Browsers therefore drop those border colors.

Fix: use the existing `--copper` token or define one intentional gold token in `:root`.

Relevant code: `src/styles.css:1-15`, `src/styles.css:269`, `src/styles.css:347`.

### 10. Deepen claim-specific sourcing over time

The source ledger has one authority reference per venue for 68 encounters. This supports the large ecological frame, but not every species identification, handling method, or local rule.

Fix: before or shortly after launch, add claim-specific links for protected species, bycatch handling, barotrauma, and local restrictions. Keep the current one-click journal presentation.

### 11. Recheck the Amazon authority link

A live automated availability check reached ten authority URLs directly. UNESCO returned expected anti-automation responses, while the INPA Amazon repository URL returned HTTP 503 and the Great Barrier Reef URL required a redirect that did not complete cleanly in the checker.

Fix: click-test those two links in a normal browser immediately before release. Replace the INPA URL if it remains unavailable; keep the title and authority metadata intact.

## Post-Launch Opportunities

- Add quiet, rights-cleared regional ambience or water sound; keep it opt-in.
- Add regional filters above the 15-card mobile destination list.
- Add export/import for the versioned local journal so progress can move between browsers.
- Add a short completion overview showing discoveries, assignments, and safe releases across all waters.
- Keep 22 featured catch reconstructions rather than illustrating all 68 encounters; the current selective approach preserves impact and package size.

## Visual Evidence

### Habitat observation

![Amazon habitat observation](05-habitat-observation.png)

### Featured catch reveal

![Peacock bass catch reveal](08-catch-reveal.png)

### Ecosystem journal

![Peacock bass ecosystem journal](10-ecosystem-journal.png)

## Release Recommendation

Do not redesign the game. Correct the assisted-control scoring, close the media and Tonle Sap review gates, add the initial repository commit, and rerun the existing release command. Those changes preserve the current playability while removing the main reasons to delay launch.
