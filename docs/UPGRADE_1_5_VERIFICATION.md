# Living Waters 1.5.0 — first audit upgrade pass

October 9, 2026. Local implementation candidate; the published GitHub/itch.io build has not been replaced. This pass implements the highest-priority controls and record-integrity work from the October 9 audit and begins its handling-decision upgrade. It does not certify a 10/10 game.

## Implemented

1. Timed encounters wait for explicit Start. Retry, restored encounters and switching back from untimed controls require readiness again. Starting with a held Enter does not transfer auto-repeat into reeling; live controls still support mouse/touch holds and focused Space/Enter.
2. The console separates scrolling reading material from its action. It measures space below the actual header and notices, reserves the mobile stage bar, and reacts when a save notice appears. Technique details are available on demand; progress, pressure and the current instruction stay prominent.
3. Assignment guidance requires a carefully handled target, using the same trip evidence as completion. Unsafe target handling is called out. A careful target remains eligible when followed by an unrelated encounter.
4. Handling choices rotate deterministically by encounter/expedition/attempt. Their order stays stable through settings changes and reload; IDs still select and score the response. Safe answers no longer occupy the first position throughout the content.
5. Version 9 observations retain full-note, identity-only and private reporting history independently. Unreturned observations remain unreported, including when a trip ends. Strict migration validates v8 first and preserves unknown historical choices instead of inventing privacy history.
6. Autosaving compares a retained snapshot and serializes cooperating upgraded writers through Web Locks where supported. A conflict preserves current memory, pauses stale writes, and offers exports or explicit adoption of the stored winner. Adoption verifies a durable displaced-journey copy before replacing memory. The recovery pointer follows the latest verified memory/replacement backup. Missing, invalid or unavailable latest data preserves the current journey.
7. Compact portable JSON reduces long-journal size. A pre-cast UTF-8 byte reserve, record cap and observation-ID guard prevent starting an unsupported new record. The engine repeats the guard at the actual cast; the presentation memoizes its reading. A confirmed new-journey flow preserves the replaced save as a recovery copy.
8. Guidance, kit and habitat selections expose pressed state. Documentation distinguishes local static serving from guaranteed browser offline caching and corrects the catch-art inventory to 24.

## Verification

- `npm run build`: **175/175 tests in 10 files**, TypeScript and production bundling passed. The existing main-chunk size warning remains; it is not a build failure.
- `git diff --check`: passed.
- Pure tests cover all **414 safe route/season combinations**, all **80 authored handling-option sets**, report choices across travel/save roundtrips, strict legacy migration, stale writers and failed recovery writes. These are code simulations, not 414 manual browser expeditions.
- Astra at Max independently reviewed the final source and ran **55/55 targeted tests**. No remaining critical source finding in this bounded pass. Independent scale probes confirmed compact roundtrip at 9,500 and 10,000 records and export after a valid large v8 migration.
- Native browser play: a timed Amazon catch reached handling using focused Space holds and a mouse hold, followed by deliberately unsafe handling and identity-only reporting. The copy correctly refused assignment readiness; identity-only history survived a new trip and reload. This intentional test record retained 16 control mistakes; it was not presented as clean technique.
- Production browser play: fresh setup, a held Enter on Start (2 seconds) left progress at zero and the reel control released, then untimed completion, careful handling and full reporting completed the assignment.
- Desktop **1280×720** and portrait **390×844** tested. Large reading text and a save notice were present in the final portrait view: action bottom **749.16 px**, stage bar top **799 px**, no horizontal overflow. The live action was wholly visible. This is a browser viewport test, not physical-phone touch qualification.
- The real eight-record v8 audit export passed UI preview/import: eight observations, seven careful responses and six full shared reports retained. The known final private choice remained private; the lost earlier identity-only choice remained honestly unknown.
- Real two-tab tests detected a newer save and preserved both available journeys. In the final production test, the displaced copy survived reload and UI export. Its assisted-control setting stayed `true`, while the stored winner's setting stayed `false`; the observation and full-report history matched.
- Final production browser warnings/errors: **none**. A development hot-reload diagnostic during editing was excluded from production claims. CLI Playwright scenarios were not run this pass; browser checks used the Codex browser's native/locator controls. The existing scenario was updated for the corrected assignment wording.

Evidence: `/Users/titansforge/Documents/Codex/2026-09-07/i/outputs/Living-Waters-Upgrades-2026-10-09/`. It includes the baseline backup, build log, native exported journeys, desktop/phone screenshots, storage tests and Astra's independent review. No asset-generation, publication, upload or licensing change occurred.

## Remaining work in order

1. **Distinct encounter mechanics and conservation purpose.** Separate fish fights, physical snag recovery, incidental-bycatch stabilization, camera and telemetry tasks. Remove signal/interference instructions from hooked animals and roots. Make accidental-bycatch practice explicit instead of encouraging collection hunting; align progress/assignment objectives with that purpose.
2. **Evidence and revision.** Preserve first explanations but allow evidence-backed revision. Require relevant fish/movement observations for migration comparisons; distinguish answered research tasks from well-supported explanations. Pilot Amazon/Tonle Sap before extending to the other paired journeys.
3. **Richer fishing decisions.** Pilot visible placement, depth/retrieval choices and readable rod/fish behavior in Amazon and Florida. Keep novice controls simple, make wrong decisions instructive, and preserve meaningful choices in assisted mode.
4. **Subject art and motion.** First fill turtle, Baikal sponge, Danube rope, Galapagos iguana and Florida seatrout gaps with contextually correct observation/handling art. Add distinct water/animal/line motion, with reduced-motion support, before expanding the remaining inventory.
5. **Sound, replay and field qualification.** Venue-specific ambience/action feedback; fresh seasonal questions and consequences; remaining offline/performance architecture; independent novice/angler/teacher playtests and physical-device/accessibility validation.

Web Locks do not protect noncooperating older writers or guarantee atomicity on unsupported browsers. Exit saving is best effort and immediate teardown can miss the last coalesced second. Browser quota can still stop saving/recovery, which preserves the current in-memory journey for export. Recovery is a limited latest-copy mechanism, not unlimited backup history. No new overall score is assigned without testing the next substantive gameplay and learning changes.
