# Living Waters 1.9.0 — subject art and handling review

2026-10-09. Local implementation and targeted acceptance pass, unpublished. Save schema remains 12. This pass addresses the next subject-art priority from the fishing pilot; it is not a new full-game grade or a learner study.

## What changed

1. Added transparent, detailed live peacock bass, common snook and spotted seatrout sprites to the Amazon/Florida angling pilot. HTML layers preserve intrinsic body proportions at different viewport shapes, decode before replacing a silhouette fallback, and use the existing saved behavior pose. Mouth anchoring keeps the line connected. Position easing was removed because it made the fish lag behind the line.
2. Added five neutral encounter reconstructions: seatrout at the waterline; incidental Amazon river turtle; Baikal sponge camera observation in place; Danube abandoned-rope snag; Galápagos marine-iguana observation from a distance. The turtle and bass remain genus-level identities. The iguana received one targeted image-tool framing edit to retain the entire tail.
3. Added method-aware art metadata for completion, response decisions, debriefs and postcards. Sponge/iguana camera work and rope incidents receive their own context. Fish art cannot substitute for another method; mismatched earlier completed records keep the habitat fallback. Neutral scenario captions do not claim that an unsafe player choice produced a successful release or recovery.
4. Put handling and postcard captions below the image. Completed phone encounters scroll normally so the new art can stay large and complete; bottom clearance keeps the next action above fixed navigation. Active timed layouts remain compact.
5. Browser QA found that rapid reload could revert recent untimed responses before the coalesced save ran. Untimed line-turn changes now request the existing guarded writer immediately. Timed one-second coalescing, Web Locks, expected-snapshot conflict checks and schema are retained. This is an immediate save request, not a guarantee against abrupt process termination or a held lock.

## Accepted art and reproducibility

Eight accepted WebPs total **1,582,874 bytes**. Five contextual images are 1280 × 853; all three sprites are 1024 pixels wide and retain genuine RGBA transparency. Conversion/downscaling used Pillow only for encoding and size; content generation and the single framing edit used the **built-in OpenAI image tool**, not a CLI. The tool did not expose an exact model name. No third-party photographs were supplied as image inputs.

The complete prompt set, generated output basenames, dimensions and source/game SHA-256 hashes are in [SUBJECT_ART_1_9_MANIFEST.json](SUBJECT_ART_1_9_MANIFEST.json). Original PNGs and a pre-edit source archive are retained in the local work output. Runtime media inventory checks now include both new asset directories and bind exact file hashes. This inventory check does not confer new publication authority.

All images are game reconstructions, not wildlife photographs, actual capture records, scientific evidence or real-world handling certification.

## Verification

- Production build, TypeScript and **297/297 tests** pass, including six new method/legacy/art presentation tests. Existing gameplay, saves, reporting and learning tests remain included.
- Astra at Max independently reviewed species/context constraints, all eight accepted assets, seven browser captures plus the exported postcard, and the narrow save change. It found no material residual content mismatch. Its manifest check covered 59 hash, dimension, alpha and size assertions; independent post-change storage/art suites passed 42/42. Astra's screenshot review is distinct from root's interactive browser work.
- Root used the ordinary journal import/confirmation flow for native-engine QA fixtures covering seven subjects; these are targeted fixtures, not a claim of seven organic full expeditions. All five new subjects were viewed in phone completion/response contexts. An unsafe seatrout choice retained a needs-care label and exported a complete PNG with reconstruction disclosure.
- Nine live-sprite layouts cover three species at 390 × 844, 844 × 390 and 1280 × 800. All decoded, retained their intended aspect ratios, had no position transition and introduced no horizontal document overflow.
- Pilot pose stays unchanged on pause. Rapid pause/reload retains the updated pilot pose and a zero-progress camera phase in the recorded checks. Reduced-motion emulation leaves the pilot pose unchanged and suppresses animation/transition.
- Production asset-failure emulation left the silhouette fallback visible and the textual cue intact when the exact fish WebP was blocked. The block/cache overrides were removed. The final normal production response/postcard check recorded no new console warnings or errors; development hot-reload dependency warnings and the intentional failure probe are separate from that clean check.
- Phone completion/postcard cropping and fixed-footer obstruction were observed, fixed and rechecked through rendered views; the Danube next action worked with an ordinary pointer click after the clearance fix.
- Current limitation: these browser dimensions are emulations, not physical phone or Windows-hardware certification. Animation remains an authored state schematic using still fish sprites, not a biomechanical swimming simulation.

## Source references used for content review

These primary references informed morphology/context review; no reference photo was downloaded into the art generation inputs.

- [FWC spotted seatrout](https://myfwc.com/wildlifehabitats/profiles/saltwater/drums/spotted-seatrout/) and [fish handling](https://myfwc.com/fishing/saltwater/outreach/fish-handling/).
- [FWC common snook](https://myfwc.com/wildlifehabitats/profiles/saltwater/snook/snook/) and [butterfly peacock](https://myfwc.com/wildlifehabitats/profiles/freshwater/butterfly-peacock/), the latter a genus example rather than a claim of this Amazon fish's exact species.
- [Smithsonian Amazon river turtle example](https://nationalzoo.si.edu/animals/yellow-spotted-amazon-river-turtle), used for genus-level morphology only.
- [Ehrlich et al. Baikal sponge research](https://pmc.ncbi.nlm.nih.gov/articles/PMC3673046/).
- [NOAA debris guidance](https://marinedebris.noaa.gov/marine-debris-handling-guidelines), general context only; not Danube jurisdictional guidance.
- [Charles Darwin Foundation marine-iguana reference](https://www.darwinfoundation.org/en/documents/110/FCD_Marine_iguanas_between_land_and_sea.pdf) and [Galápagos National Park visitor guidance](https://galapagos.gob.ec/campana-yo-si-cumplo-promueve-el-respeto-de-las-reglas-de-visita-en-galapagos/).

## Next priorities, in order

1. **Novice calibration:** watch new players without coaching through timed casting, three behavior windows, one failed attempt/retry and a response decision. Measure misunderstood cues, first successful attempts and accidental holds before widening the pilot across waters.
2. **Audio feedback:** add restrained, distinct cast/strike/line-pressure/landing or survey-confirmation sounds; all instructions remain readable without sound. Review optional ambience separately.
3. **Extend the stronger live presentation:** choose representative additional fish after the pilot's control and cue calibration; keep each anatomy, habitat, behavior and saved-rule boundary distinct.
4. **Bounded motion polish:** subtle fin/tail motion and water occlusion, still driven by saved behavior and respecting pause/reduced motion. Avoid adding loops that contradict the actual encounter phase.
5. **Content/art consistency:** reconcile the plant-edge kit's circle-hook wording with its turtle response's barbless wording, then perform another expert handling review. Extend method-aware imagery only where current panorama/record art leaves a meaningful gap.

Do not award 10/10 on the strength of generated art alone. Uncoached learner evidence, physical-device checks and richer natural motion remain necessary before a stronger overall quality claim.

