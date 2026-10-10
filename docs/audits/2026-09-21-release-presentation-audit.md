# Living Waters — release-focused audit

September 21, 2026. Local source version 1.1.0. Audit only: no game source edits or publishing performed. Existing release status documents refer to older, different verification boundaries; this audit does not confirm an itch.io release.

## Assessment

A working educational expedition with attractive habitat and catch art, a substantive journal, and a well-tested engine. The highest-value work is the first-session experience and fishing presentation, not adding more destinations. No release-blocking crash was encountered in the tested route. This is a bounded review, not a claim that all routes are bug-free.

## What was actually verified

- Fresh local session at 127.0.0.1:5197, desktop browser (~1703×877 captured viewport).
- Amazon Guided: arrival, two guide questions, root-edge kit, flooded forest selection, prediction, timed cast placement, pause, switch to untimed controls, eight assisted fight windows, peacock bass, safe handling, correct reflection, full-notes community return, Assignment complete.
- Reload restored the completed expedition. Ecosystem journal loaded its discovered subject, relationships and source links. Atlas showed Amazon's careful observation as shared.
- Opened Baikal arrival and inspected its assignment. This was not a completed Baikal survey.
- Destination search: matching Baikal result; unmatched query leaves the all-15 heading and unrelated research module with no no-results message.
- 126 tests / six files passed. TypeScript passed. Vite production build passed with a 510.85 kB main JS chunk warning (157.60 kB gzip). No performance trace or real-device latency benchmark was run.
- Existing provenance checker passes for habitats and guide portraits. Catch reconstruction records exist in MEDIA_RIGHTS.md but are not covered by that checker's two required asset-family rows.
- Timed casting and pause were exercised, but the fight was completed with assistance. Automated timing tests passed; this is not a manual timed-skill usability certification.
- No new mobile, screen-reader, Safari, Firefox, full 15-destination, long-session, or learner study is claimed. Earlier September 7 verification remains historical evidence only.

## Ranked fixes and upgrades

### 1. Make the cast and fight feel like fishing (highest visual/gameplay leverage)
Evidence: App.tsx CastGame uses the same habitat image, Fish/Leaf icon and line; styles.css .line-event fixes it at left 53%, top 55% and pulses it. The scene does not visually communicate the fish approaching, changing direction, or surfacing as progress increases. Strong catch artwork appears only after the fight.

Build: short cast/lure landing animation, ripples, line angle/slack reacting to pressure, restrained fish movement tied to run/rest and distance, then a clear alongside/catch reveal. Use existing species art first; generate targeted silhouettes or underwater plates only where needed. Preserve passive-survey differences, reduced motion and untimed access.

Acceptance: a viewer can distinguish cast, run, reel and completion from the scene without reading the console. Reduced-motion and assist modes retain equivalent feedback. No engine or save-format change is required for the first pass.

### 2. Reduce the reading barrier before the first cast
Evidence: fresh launch leads with a long comparative research question. Amazon then asks the player through arrival, two guide questions, gear, habitat and prediction before casting. Guided mode already gives exact kit/habitat answers; requiring another full reading sequence adds friction rather than a new choice.

Build: a prominent first-expedition option, concise guide exchange, compact kit rationale and one short prediction. Keep full research journeys, detailed source material and Field mode available. Offer contextual hints rather than presenting all instructions at once.

Acceptance: first-time route has a clearly visible next action at every step, no redundant confirmation screens, and a measured target of first cast within 60–90 seconds in a novice usability test. This timing target has not yet been tested.

### 3. Keep primary controls visible; let the art breathe
Evidence: at the captured desktop size, Amazon's five-line hero pushes Meet your guide below the fold. The handling photo similarly pushes both handling choices below the initial viewport. Pause inserts a large block above the fight and moves controls farther down. Catch artwork itself is worth preserving.

Build: smaller responsive hero, compact assignment brief, responsive scene/console proportions, and a persistent action area where appropriate. Place handling decisions alongside the fish on desktop and directly below a shorter image on mobile. Avoid reducing the scene to a dashboard.

Acceptance: check 1366×768, 1440×900 and 390×844 with normal and larger text; the next action is immediately discoverable, no overlap or horizontal overflow, and active fight controls do not jump when pausing/resuming.

### 4. Give each completed expedition a stronger payoff
Evidence: community completion shows Assignment complete and Shared survey added with next buttons. It does not visually celebrate the new species/season record or explain the next research step as clearly as the underlying system could. Engine rewards full notes and marks observations shared; there is no remote community upload.

Build: a compact expedition postcard showing species, habitat, season, handling and newly connected ecological relationship; highlight the next destination needed for the paired report. Say explicitly that sharing is within the game's simulated community. Let the player export a postcard voluntarily; do not add telemetry or automatic social posting.

Acceptance: the player can answer what was learned, what changed, and what to try next from one summary screen. Keep participation points separate from learning claims.

### 5. Give repeat visits meaningful variation (second-pass gameplay work)
Evidence: the fight loop alternates run/rest with meters; continuous holding still eventually completes routes per existing tests and engine logic, with worse technique credit. Changing kit returns through another preparation flow. Seasonal and assignment systems already exist, so this can be improved without expanding the world list.

Build: clearer visual species rhythm, habitat/season-specific cues, and visible consequences for rough control such as slower retrieval or a lower-quality observation, with a friendly retry. Preserve Guided/assist accessibility and avoid punitive failure as the default. Add quick same-kit recasts while leaving change-kit available.

Acceptance: expert play feels distinct from holding the button; guided play remains forgiving; repetition reveals new ecological context instead of repeating identical instructions. Test against all existing reachable routes.

### 6. Repair search feedback (small confirmed usability defect)
Reproduction: open atlas; enter zzzz-no-water. No destination cards remain, but the heading still says Explore all 15 waters and the full research panel remains. There is no no-results explanation or clear-search action.

Build: result count, explicit empty state, clear search button, and compact/hide unrelated research content while searching. Source: App.tsx VenueSelect lines 46–49.

Acceptance: zero/one/multiple results are clearly identified; clearing restores all 15; keyboard focus remains predictable.

### 7. Finish release documentation and asset coverage
Evidence: package.json is 1.1.0; RELEASE_STATUS.md still describes 1.0.0 and August 30 checks. UPGRADE_VERIFICATION.md explicitly describes the September 7 local edition. Existing media script checks only habitat/guide families, while catch assets have a separate summary in MEDIA_RIGHTS.md.

Build: one current release manifest/status with exact ZIP hash, version and actual checks; extend the existing media inventory/check coverage to catch reconstructions using existing records rather than inventing new approvals. Review fish morphology and handling against references before changing biologically specific art.

Acceptance: build/version/ZIP/docs agree, every shipped asset family is inventoried, and local-ready vs uploaded vs verified-public remain distinct. Do not broadly replace the strong environment/portrait library.

### 8. Final focused release checks
Check mobile control placement, wrong handling/reflection feedback, a non-fish encounter, a passive survey, save/export/import, and the two-destination research completion on the final frozen build. Reduce initial JS only if a real loading trace shows a material delay; the chunk warning alone is not a blocker. Include optional subtle water/reel/splash feedback with a mute control, but do not let audio work displace priorities 1–3.

## Recommended two-pass scope

**Pass 1:** priorities 1–3 and 6: animated fishing feedback, faster introductory flow, visible controls, search feedback. Preserve current art and tested mechanics.

**Pass 2:** priority 4, bounded parts of 5, documentation and focused release checks. Then package and review for itch.io. No broad content expansion or full art replacement is needed before the next release.

## Evidence files

The workspace audit folder contains amazon-journal.png, baikal-arrival.png and search-no-results.png. Additional arrival, fight and handling screenshots were viewed inline during this audit. Test outcomes are from the current local commands; historical documentation is explicitly distinguished above.
