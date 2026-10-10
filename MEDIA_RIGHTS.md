# Media Rights

The application code is licensed under MIT. Media is tracked separately and is not automatically covered by the code license.

## Asset inventory

| Asset family | Files | Origin | Release status |
|---|---|---|---|
| Habitat panoramas | `src/assets/*.webp`, excluding `*-guide.webp` | Generated through OpenAI image generation in Codex on August 13, 2026 | Owner-confirmed for public redistribution; see provenance record |
| Guide portraits | `src/assets/*-guide.webp` | Generated through OpenAI image generation in Codex on August 13, 2026 | Owner-confirmed for public redistribution; see provenance record |
| Catch reconstructions | `src/assets/catches/*.webp` | Generated for Titans Forge with OpenAI image generation on August 14, 2026 | Cleared for use subject to the provider terms applicable to the generating account |
| Contextual encounter reconstructions | `src/assets/encounters/*-v1.webp` | OpenAI built-in image generation in Codex, October 9, 2026; five scenes | Local upgrade, not published; exact outputs, prompts and hashes in `docs/SUBJECT_ART_1_9_MANIFEST.json` |
| Live fish profiles | `src/assets/fish-sprites/*-v1.webp`, excluding turn and oblique views | OpenAI built-in image generation in Codex, October 9, 2026; four transparent profiles | Local upgrade, not published; exact outputs, prompts and hashes in `docs/SUBJECT_ART_1_9_MANIFEST.json` and `docs/SUBJECT_ART_1_11_MANIFEST.json` |
| Live fish front views | `src/assets/fish-sprites/*-turn-v1.webp` | OpenAI built-in image generation in Codex, October 9, 2026; four views | Local upgrade, not published; `docs/SUBJECT_ART_1_13_MANIFEST.json` |
| Live fish oblique views | `src/assets/fish-sprites/*-oblique-v1.webp` | OpenAI built-in image generation in Codex, October 9, 2026; four views | Local upgrade, not published; `docs/SUBJECT_ART_1_14_MANIFEST.json` |
| Interface concept | `design-concept.png` | AI-generated development reference | Development/reference use; not loaded by the application |
| Icons | Runtime Lucide React components | Lucide project | ISC License; see dependency package metadata |

No guide portrait depicts or claims to depict a real guide. Catch images are reconstructions with fictional participants, not documentary records of actual captures.

The October 9 contextual scenes are neutral game scenarios: waterline fish handling, incidental bycatch, in-place camera observation and an equipment snag. They do not document the player's chosen response or an actual animal release or debris recovery. The turtle and peacock bass retain the game's genus-level identities. No third-party reference images were supplied for generation. WebP conversion and resizing preserve sprite alpha; the iguana framing was revised with the same built-in image tool. Provider/model identity is recorded only to the extent reported by that tool. Media remains separate from the code license and subject to the terms of the generating account.

## Required owner record

The project owner has retained the provider name, account holder, generation date, applicable provider terms, and redistribution confirmation for the habitat and guide assets.

Use `docs/MEDIA_PROVENANCE_RECORD.md` to record that confirmation without placing private account receipts in the public repository.

## Scientific fidelity

Generated catch art is subject to a morphology review covering body shape, fin placement, markings, mouth and teeth, habitat, handling posture, and equipment. Passing visual review does not convert generated art into biological evidence; factual claims are supported separately through `src/data/sourceLedger.ts`.

## Giant-fish artwork — September 22, 2026

The arapaima and beluga research reconstructions were newly generated with the built-in OpenAI image tool in this Titans Forge session, following the owner request to add both playable fish. They are not part of the August 14 catch batch. No third-party reference images were supplied. Original outputs are retained in the Codex generated_images directory. Game files are WebP format conversions of those outputs; no external photographs were used. These are illustrations, not evidence of real research captures. Applicable OpenAI terms: https://openai.com/policies/terms-of-use/ .

- `arapaima.webp`: source `exec-b3018286-81a3-49e7-9174-e9d2c5943a0d.png`; SHA-256 `cff561f1300ae16b04c2b9482036b5a3490b30880bd44adbe86e854b18ae3c16`.
- `beluga-research.webp`: source `exec-a081e0ff-b574-4430-ad85-d754f87148d6.png`; SHA-256 `05d62ad567598abfb05a6a3837992f513bac0391e457415bcf3243c38856a357`.

## Fish turn views — October 9, 2026

Four new locally generated turn illustrations accompany the existing side sprites. They use the built-in OpenAI image tool and existing generated artwork as reference inputs, with one snakehead edge-isolation edit. Exact prompts, sources, hashes and alpha are in `docs/SUBJECT_ART_1_13_MANIFEST.json`. Pillow only downscaled and encoded RGBA WebPs. These game reconstructions remain unpublished, separate from the code license and subject to the generating account terms. No new account receipt or redistribution confirmation is asserted by this record.

## Fish intermediate turn views — October 9, 2026

Four new oblique fish illustrations use the built-in OpenAI image tool with the existing generated profiles as identity references. Exact prompts, original output names, source/final hashes and alpha extrema are in `docs/SUBJECT_ART_1_14_MANIFEST.json`. Pillow only downscaled full RGBA frames and encoded WebPs. Display framing preserves each image aspect ratio and calibrates silhouette depth against its profile. These unpublished game reconstructions remain separate from the code license and subject to the generating account terms. This record asserts no new receipt or redistribution confirmation.
