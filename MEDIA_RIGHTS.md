# Media Rights

The upgraded edition's current policy is Forge Game Hosting License 1.0;
earlier grants are retained in LICENSING.md and LICENSE-LEGACY-MIT.txt.
Media is tracked separately and is not automatically covered by the code license.

## Asset inventory

| Asset family | Files | Origin | Release status |
|---|---|---|---|
| Habitat panoramas | `src/assets/*.webp`, excluding `*-guide.webp` | Generated through OpenAI image generation in Codex on August 13, 2026 | Owner-confirmed for public redistribution; see provenance record |
| Guide portraits | `src/assets/*-guide.webp` | Generated through OpenAI image generation in Codex on August 13, 2026 | Owner-confirmed for public redistribution; see provenance record |
| Catch reconstructions | `src/assets/catches/*.webp` | Generated for Titans Forge with OpenAI image generation on August 14, 2026 | Cleared for use subject to the provider terms applicable to the generating account |
| Interface concept | `design-concept.png` | AI-generated development reference | Development/reference use; not loaded by the application |
| Icons | Runtime Lucide React components | Lucide project | ISC License; see dependency package metadata |

No guide portrait depicts or claims to depict a real guide. Catch images are reconstructions with fictional participants, not documentary records of actual captures.

## Required owner record

The project owner has retained the provider name, account holder, generation date, applicable provider terms, and redistribution confirmation for the habitat and guide assets.

Use `docs/MEDIA_PROVENANCE_RECORD.md` to record that confirmation without placing private account receipts in the public repository.

## Scientific fidelity

Generated catch art is subject to a morphology review covering body shape, fin placement, markings, mouth and teeth, habitat, handling posture, and equipment. Passing visual review does not convert generated art into biological evidence; factual claims are supported separately through `src/data/sourceLedger.ts`.

## Giant-fish artwork — September 22, 2026

The arapaima and beluga research reconstructions were newly generated with the built-in OpenAI image tool in this Titans Forge session, following the owner request to add both playable fish. They are not part of the August 14 catch batch. No third-party reference images were supplied. Original outputs are retained in the Codex generated_images directory. Game files are WebP format conversions of those outputs; no external photographs were used. These are illustrations, not evidence of real research captures. Applicable OpenAI terms: https://openai.com/policies/terms-of-use/ .

- `arapaima.webp`: source `exec-b3018286-81a3-49e7-9174-e9d2c5943a0d.png`; SHA-256 `cff561f1300ae16b04c2b9482036b5a3490b30880bd44adbe86e854b18ae3c16`.
- `beluga-research.webp`: source `exec-a081e0ff-b574-4430-ad85-d754f87148d6.png`; SHA-256 `05d62ad567598abfb05a6a3837992f513bac0391e457415bcf3243c38856a357`.
