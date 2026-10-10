# Media Provenance Record

Complete this owner record before publicly redistributing any habitat panorama or guide portrait. Do not infer a provider from visual style or file metadata.

| Asset family or files | Provider | Account holder | Generation date or window | Applicable terms URL and version/date | Redistribution confirmed by owner | Confirmation date |
|---|---|---|---|---|---|---|
| Habitat panoramas (`src/assets/*.webp`, excluding guides and catches) | OpenAI image generation through Codex | Justinian Capone, for Titans Forge LLC | 2026-08-13 | https://openai.com/policies/terms-of-use/ | Yes | 2026-08-30 |
| Guide portraits (`src/assets/*-guide.webp`) | OpenAI image generation through Codex | Justinian Capone, for Titans Forge LLC | 2026-08-13 | https://openai.com/policies/terms-of-use/ | Yes | 2026-08-30 |

Retain supporting receipts or exports outside the public repository if they contain account information. Record only enough here to establish provenance and the governing terms.

## October 9, 2026 subject-art generation

Eight new game illustrations were generated through OpenAI's built-in image capability in Codex at the owner's request. They are separate from the August asset batches. Exact source output names, original and game-file SHA-256 hashes, dimensions, prompts and the single iguana framing edit are recorded in `SUBJECT_ART_1_9_MANIFEST.json`. The tool did not report an exact model name. No external reference photographs were supplied. Sources reviewed for morphology and context are listed in `SUBJECT_ART_1_9_REVIEW.md`; they are factual references, not image inputs.

Original PNGs are retained locally; accepted game assets are converted WebPs in `src/assets/encounters/` and `src/assets/fish-sprites/`. The three cutouts retain actual transparent alpha. These local reconstructions have not been published, and this entry does not invent an account receipt, terms version or new release authorization.

## October 9, 2026 audit-fix sprite

One additional adult giant snakehead cutout was generated with OpenAI's built-in image capability in Codex during the owner's requested audit-fix pass. `SUBJECT_ART_1_11_MANIFEST.json` records the separate output, exact prompt, original and game-file hashes, dimensions and transparent alpha. No reference photographs were supplied; the USGS sources listed in that manifest informed morphology only. The tool did not report an exact model name. Pillow was used only to downscale and encode the transparent WebP. This local generated reconstruction has not been published; the earlier owner confirmation dates and terms receipts have not been extended to it.

## Evidence boundary

- Local creation metadata places both asset families in paired generation batches on August 13, 2026.
- The files were generated through the OpenAI image capability used by Codex and converted to WebP for the application.
- The OpenAI Terms of Use effective January 1, 2026 and Service Terms updated June 12, 2026 were the published terms in force during that generation window. The Terms assign OpenAI's interest in output to the user to the extent permitted by law while leaving responsibility for lawful use and review with the user.
- On August 30, 2026, Justinian Capone confirmed the account-holder record above and authorized public redistribution of both asset families for Titans Forge LLC.

## Fish turn views — October 9, 2026

Four additional transparent turn reconstructions were generated with the OpenAI built-in image capability in Codex for the owner-requested animation pass. Each uses the existing locally generated side sprite as its identity reference. The giant snakehead received one edge-isolation edit with the same tool. `SUBJECT_ART_1_13_MANIFEST.json` binds accepted outputs, source/game hashes, prompts, reference inputs, dimensions and alpha. Full source PNGs remain local; Pillow only downscaled and encoded the full RGBA frames. The tool did not report a model name. These illustrations are not scientific encounter evidence and remain unpublished; prior owner confirmations and terms receipts are not extended to this batch.
