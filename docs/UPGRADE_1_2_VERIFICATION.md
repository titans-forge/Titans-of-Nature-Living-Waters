# Living Waters 1.2.0 — presentation and play-flow upgrade

Local candidate prepared September 21, 2026. **Not uploaded or publicly verified.**

## Changes

- State-driven surface illustration replaces the pulsing icon: moving fish shadow, ripple rings, line angle/strain, different fight rhythms, progress toward the boat, cast-line reveal and landed-catch artwork.
- Passive surveys use signal feedback and do not show a hooked fish or capture photograph. Motion pauses with the game; reduced-motion mode disables animations and transitions.
- Prominent Amazon entry; long research journeys remain available in a collapsible atlas section. Arrival headline and assignment are compact, with the start button visible.
- Guided players can accept the authored kit after their two guide questions. No question, prediction or observation is invented. Manual kit selection and Field mode remain available.
- Repeat casts can reuse equipment while returning to habitat selection; attempt limits and habitat closures still apply.
- Desktop handling places decisions beside the art. A 390-pixel layout review prompted a tighter fishing console without overlapping sticky controls. Pause now overlays the scene instead of pushing it down.
- Completion postcard shows species, season, place and handling, with a next-research-stop prompt. Optional local PNG download includes a game-illustration label; no automatic sharing or network upload.
- Explicit no-results state, result counts, clear search, and removal of unrelated atlas content during search.
- Existing catch-media inventory now participates in the provenance checker using its existing rights record. No new asset-generation or owner approval is claimed.

## Verification

- 129 tests pass across seven files; TypeScript and Vite production build pass.
- New tests check guided prerequisites, authored kit selection across all 15 destinations, save acceptance, no fabricated learning answers, Field-mode boundary and repeat-cast attempt guards.
- Desktop browser: fresh Amazon Guided route through new shortcut, cast/fight, reveal, handling and same-kit recast. Earlier 1.1 save loaded into the updated UI without a schema change.
- 390×844 CSS-pixel embedded viewport: Amazon introduction, uncertain prediction, assisted catch, safe handling, incorrect reflection feedback, community return, postcard, search zero/clear/one results. This is a layout test, not physical-phone or touch-device certification.
- Baikal camera kit: selected deep-edge habitat, prediction, receiver placement and assisted observation to completion. Survey feedback correctly avoided hooked-fish imagery.
- Postcard download verified on disk and visually inspected: 1200×940 PNG, readable text and correct selected record.
- Final production build opened successfully in browser. ZIP smoke test confirms index.html at archive root. Media checker passes existing habitat, guide and catch records.
- Existing timed mechanics are unchanged and their automated suite passes. Manual play completed the fight with assistance; no claim of manual expert-timing certification. No new full 15-venue playthrough, physical device, screen-reader or learner study.

## Package

- Version: 1.2.0
- File: release/living-waters-html5-v1.2.0.zip
- SHA-256: 1140e332ab55ab3e97a5d3c65bd5efe3474a81e2b9bbae4c65e7f4403929a925
- Files: 56; unpacked bytes: 10726749
- Main JS: 517.03 kB, 159.94 kB gzip. Vite's chunk-size advisory remains; no measured loading regression is claimed.

## Remaining quality work

Real-device/touch testing and a short novice playtest remain valuable before calling this a final polished release. More anatomically specific underwater animation, optional reel/splash audio and deeper community branching are future improvements, not delivered features. Core catch probability/difficulty and save schema remain unchanged in this pass. Existing static art was preserved.

## Recovery

Pre-edit App.tsx, styles.css, engine.ts and package manifests are in the workspace output rollback folder. Previous release artifacts are retained in previous-release/. No broad Git reset, deployment, tag, upload, or social publication was performed.
