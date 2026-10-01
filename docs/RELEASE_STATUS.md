# Release Status

## Published — 1.4.0

Arapaima and beluga research fights, dedicated artwork, season routes and source references. 135 tests, TypeScript, production build, media check, and ZIP-root smoke check passed. Both new encounters were played through assisted catch/handling screens in the local browser.

Package: `release/living-waters-html5-v1.4.0.zip`
SHA-256: `28e0d1ef90e4810c3e2002b7a9495a60e4fd39e656cc8cf6b8f035e11144e363`

Published September 22, 2026 at https://titans-forge.itch.io/living-waters. Project 5038733, HTML build 19348421. Hosted launch, arapaima equipment, beluga assignment and public description verified. Prior versions retained as hidden backups. Receipt: social workspace outputs/Living-Waters-Giants/itch-release-receipt.json.

## Previous release — 1.3.0

Skill fishing update packaged and validated with 131 tests, TypeScript, production build, and ZIP-root smoke check. Browser checks covered timed casting entry, cues, untimed completion, handling, recast, pause, and the 390×844 layout. Sustained physical touch input remains for device playtesting.

Package: `release/living-waters-html5-v1.3.0.zip`
SHA-256: `601f0bd3dd883cb0507809f6bb4b468a8974623320dd27c74fa2407c4ddfe774`

Published at https://titans-forge.itch.io/living-waters (project 5038733, HTML build 19348205). Verified public status, updated description, and hosted launch with Skill fishing hold/release mode. Version 1.2.0 remains a hidden rollback archive. Receipt: social workspace outputs/Living-Waters-Skill-Fishing/itch-release-receipt.json.

## Previous release — 1.2.0, September 21, 2026

Local build and HTML5 package verified. 129 tests, TypeScript, production build, media inventory checker and ZIP-root smoke test pass. Desktop and 390-pixel browser checks are detailed in [1.2 verification](UPGRADE_1_2_VERIFICATION.md).

Package: `release/living-waters-html5-v1.2.0.zip`  
SHA-256: `1140e332ab55ab3e97a5d3c65bd5efe3474a81e2b9bbae4c65e7f4403929a925`

Published at https://titans-forge.itch.io/living-waters (project 5038733, hosted HTML build 19347952). Verified the Published status, Run game launch, fifteen-destination selector, and Amazon Guided expedition on itch.io. Free browser play, fullscreen, mobile-friendly layout, and scrollbars enabled. Release receipt: `outputs/Living-Waters-Upgrade-01/itch-release-receipt.json` in the social workspace. Physical-device testing and owner playtesting remain follow-up work.

## Historical 1.0.0 status (superseded local candidate)


Verified on August 30, 2026.

## Technical release candidate

- Version: `1.0.0`
- Deterministic engine and validation tests: 47 passed
- Desktop Chromium expedition: passed through clean assisted play, save/resume, safe handling, accessible journal review, and completed community report
- Portrait-mobile Chromium expedition: passed
- TypeScript and production build: passed
- Production dependency audit: 0 known vulnerabilities
- HTML5 package: `release/living-waters-html5-v1.0.0.zip`
- Package contents: 55 files, with `index.html` at the ZIP root
- Package size: approximately 9.8 MB
- SHA-256: `b35fdc3e4e7bd100d617949bbf9388f5da71c5dab3dd567e86ac1d56ff1b1da5`
- Reproducibility: two consecutive release builds produced the same archive checksum

The release directory is generated and intentionally excluded from Git. Run `npm run release:itch` to reproduce the package and checksum after any source change.

## Owner release gate

Cleared August 30, 2026. `docs/MEDIA_PROVENANCE_RECORD.md` records the provider, account holder, generation window, governing terms, and owner authorization for the habitat panoramas and guide portraits.

## Not yet performed

- Initial Git commit
- GitHub remote configuration, tag, or release
- itch.io upload and public-page verification: completed for 1.2.0 above

Use `docs/RELEASE_CHECKLIST.md` for those publishing steps.
