# Titans of Nature: Living Waters

**Every cast reveals part of a living system.**

Living Waters is a free, local-first educational fishing expedition. Fifteen destinations connect conversations with fictional local guides, field equipment, habitat reading, fish and non-fish encounters, wildlife handling, seasonal change, and a shared ecosystem journal.

No account, API key, AI service, analytics system, or backend is required. A downloaded static build can run from a local server without an internet connection. Browser cache alone does not guarantee offline access to every asset.

## Release 1.15.0

[Play on GitHub](https://titans-forge.github.io/Titans-of-Nature-Living-Waters/) · [Play on itch.io](https://titans-forge.itch.io/living-waters) · [Download the latest ZIP](https://github.com/titans-forge/Titans-of-Nature-Living-Waters/releases/tag/v1.15.0).

October 11, 2026 edition: submerged fish fights across fourteen fishing waters, species-aware movement and habitat artwork, pressure pulses, rod-side decisions, clearer coaching and preserved older saves. See [release status](docs/RELEASE_STATUS.md). Publishing was staged from the existing public repository to preserve its approved license terms; its release scripts stage the required notices.

## Play locally

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Start with the Amazon in **Guided** mode for the clearest introduction. **Field** mode removes route answers while preserving the same evidence. The accessibility control provides untimed casting and line management.

## Verify

Install the Chromium test browser once, then run the complete release gate:

```bash
npx playwright install chromium
npm run check
```

The build runs the deterministic test suite covering timed control, observations, content, save validation, migration, reporting history and stale-writer protection, followed by TypeScript and production bundling. The repository also includes desktop/mobile Playwright scenarios. The September 7 research edition was exercised through the Codex in-app browser; see `docs/UPGRADE_VERIFICATION.md` for the exact tested scope.

## Create the itch.io package

```bash
npm run release:itch
```

This rebuilds the game and creates:

- `release/living-waters-html5-v1.15.0.zip`
- `release/living-waters-html5-v1.15.0.zip.sha256`
- `release/living-waters-html5-v1.15.0.zip.manifest.json`

The ZIP places `index.html` at its root and is ready for itch.io's **This file will be played in the browser** option. Recommended page copy and embed settings are in [docs/ITCH_PAGE.md](docs/ITCH_PAGE.md).

For a public build, first complete the owner-held media record and run:

```bash
npm run release:public
```

This intentionally stops before packaging if either habitat or guide provenance remains incomplete.

## Local controls and records candidate (1.5.0)

Timed encounters wait for explicit Start, controls remain outside scrolling instructions, handling choices are counterbalanced, and the journal distinguishes full notes, identity-only reports and private notes. Conflict detection and write locks protect cooperating tabs; validated older saves migrate with recovery copies. This candidate is local and unpublished. See [current verification](docs/UPGRADE_1_5_VERIFICATION.md).

## Presentation edition (1.2.0)

A shorter Guided route, animated fishing feedback, responsive handling decisions, same-kit recasts and downloadable expedition postcards build on the research edition. The artwork and local-only save model are retained. See [current verification](docs/UPGRADE_1_2_VERIFICATION.md) for checks, package identity and remaining testing.

## Research edition (1.1.0)

Three research journeys connect Amazon/Tonle Sap, Baikal/Danube, and Alaska/Galapagos. Bring a carefully handled, shared observation from both destinations, then compare the mechanism. All 15 destinations remain open for exploration.

Thirty-three prediction, explanation, and comparison questions preserve first answers, including uncertainty. Twenty-four glossary terms support reading. A detailed journal records the actual season, habitat, method, handling, placement, control, assistance, and sharing. Activity points describe participation; they do not certify mastery.

The field journal includes portable JSON export and import with preview and replacement confirmation. Known older saves migrate conservatively with recovery backups; malformed saves are preserved. Browse the atlas without losing the active trip. Timers pause in the journal, on explicit pause, and when the page is hidden; restored casts wait for explicit resume.

Larger text, reduced-motion support, untimed controls, keyboard navigation, and optional synthesized water ambience are available. This edition is locally verified and prepared for learner testing; no learner outcomes or perfect scores are claimed.

## Current scope

The game includes Amazon, Okavango, Tonle Sap, Florida Bay, Southeast Alaska, Lake Baikal, Lake Holiday, Nile, Euphrates, Ganges, Danube, Great Barrier Reef, Seto Inland Sea, Yellow River Delta, and Galapagos expeditions.

Each destination has local questions, three loadouts, three habitats, a three-attempt field session, distinct encounter behavior, non-fish observations, handling decisions, seasonal return visits, and local progress. Twenty-four major catches have dedicated photographic reconstructions; secondary organisms and snags remain journal-led.

Guide characters are narrative composites. Authority references and factual boundaries are available through discovered journal entries. The simulation is not current biological, access, fishing, or regulatory guidance. Always verify local rules before real activity.

## Documentation

- [Teacher guide](TEACHER_GUIDE.md)
- [Learner playtest protocol](LEARNER_PLAYTEST.md)
- [Research edition verification](docs/UPGRADE_VERIFICATION.md)
- [Game design](GAME_PLAN.md)
- [Research and review boundary](docs/RESEARCH_NOTES.md)
- [Release fidelity and QA](docs/FIDELITY_QA.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Media rights](MEDIA_RIGHTS.md)
- [Media provenance record](docs/MEDIA_PROVENANCE_RECORD.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License and media

The upgraded edition's release policy is [Forge Game Hosting License 1.0](LICENSE), with previous grants retained as described in [LICENSING.md](LICENSING.md). Images and other media have separate status documented in [MEDIA_RIGHTS.md](MEDIA_RIGHTS.md).

The owner-confirmed provider, generation window, account-holder record, governing terms, and redistribution authorization are retained in [docs/MEDIA_PROVENANCE_RECORD.md](docs/MEDIA_PROVENANCE_RECORD.md).
