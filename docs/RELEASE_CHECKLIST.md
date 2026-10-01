# Release Checklist

## Research edition 1.1.0 — local only

The September 7 edition is documented in [UPGRADE_VERIFICATION.md](UPGRADE_VERIFICATION.md). Its production build, unit tests, local packaging, and in-app browser checks are verified there. No upload, tag, public release, or learner validation has been performed for 1.1.0. The checked entries below are the inherited 1.0.0 preparation record; they are not new 1.1.0 approvals.

## Required before public upload

- [x] Record the provider, generating account, generation date, and applicable terms for every habitat panorama and guide portrait.
- [x] Confirm the project owner authorizes redistribution of those files.
- [x] Run `npm ci` from the committed lockfile.
- [x] Run `npm run check`.
- [x] Run `npm run release:itch` for the internal release candidate.
- [x] Confirm `release/living-waters-html5-v1.0.0.zip` opens with `index.html` at its root.
- [x] Run `npm run release:public`; it must pass the media-provenance gate before upload.
- [ ] Upload the HTML5 ZIP to itch.io and select **This file will be played in the browser**.
- [ ] Use the embed settings in `docs/ITCH_PAGE.md`.
- [ ] Test one Guided expedition and one mobile load from the uploaded page.
- [ ] Create a GitHub release tagged `v1.0.0` and attach the ZIP plus `SHA256SUMS.txt`.

## Public page review

- [ ] Explain that the game is free, local-first, and educational.
- [ ] State that guide characters are fictional composites.
- [ ] Keep the real-world rules disclaimer visible.
- [ ] Link `MEDIA_RIGHTS.md`, `docs/RESEARCH_NOTES.md`, and the MIT code license.
- [ ] Add three screenshots: destination selection, habitat reading, and a catch/field-record reveal.

## Stop gate

Do not publish the media bundle if the habitat and guide provider record remains unresolved. The code can be open sourced separately, but silence is not a substitute for provenance.
