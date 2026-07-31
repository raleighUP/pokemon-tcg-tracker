# Physical photo dataset collection protocol

## Purpose and label target

Collect complete 60-card deck photos for a future localizer whose primary output is **one bounding box per logical stack**: all copies of the same printed card grouped together. Draw the full logical-stack envelope. Add the visible top-card box when practical, but do not infer identity, quantity, missing stacks, or deck totals from a decklist.

Top-card-only detection is visually simpler but moves the hardest stack-expansion problem downstream. Instance masks cost substantially more to annotate without evidence they are needed. A two-stage top-card detector plus classical stack expansion remains the fallback if reviewers cannot agree consistently on logical-stack boxes.

## Capture unit and identifiers

One capture session is one physical layout, device, environment, and photographer. Give every image a stable `imageId`, every deck a non-identifying `deckId`, every unchanged layout a `physicalLayoutId`, and every session a `captureSessionId`. Minor camera movements or augmentations of an unchanged layout belong to the same group. Do not count burst frames as independent diversity.

Before capture, record device class, orientation, lighting, background, camera angle, layout, sleeves, and quality notes. Do not include personal information in IDs or notes.

## Required variation

Across Stage A, deliberately include multiple iPhone generations and at least one Android device where practical; bright, dim, daylight, directional light, mild shadows, and glare; light/dark solid surfaces, playmats, wood/textured tables, and mild clutter; overhead and moderate horizontal/vertical angles, slight rotation, and varied distance; unsleeved, clear, matte, and glossy sleeves; small/large, aligned/offset, and closely spaced stacks.

Use at least five distinct decks at Stage A and twenty at Stage B. Include different eras, rarity treatments, full-art/dark/bright/holographic cards, basic Energy stacks, and visually similar cards. Re-layout a deck between sessions. Avoid exact replicas of the four canonical fixtures.

## Capture checklist

1. Confirm the complete deck is in frame and each logical stack can be identified by a human.
2. Capture at native resolution without portrait-mode segmentation or social-app filters.
3. Reject severe motion blur, clipped stacks, or unreadable compression unless intentionally collecting a difficult case.
4. Record metadata immediately; hash-based duplicate checks run later.
5. Photograph a materially different layout or environment before creating another independent group.
6. Never use expected counts, a decklist, or a 60-card total to invent missing boxes.

## Annotation and review

Draw logical-stack bounds first. Add top-card bounds second. Mark truncation, occlusion, perspective, difficult cases, and ignored regions explicitly. Identity is optional for localization training. A different person should review locked fixtures when possible.

A fixture may be locked only when image/session/source/orientation metadata and reviewer are present; included regions are locked; dimensions match; IDs and bounds are valid; and no exact duplicate boxes exist. Heavy overlap, unusual size, missing top-card bounds, and difficult/high-perspective cases are warnings requiring judgment.

## Staged targets

| Stage | Photos | Logical stacks | Minimum diversity | Use |
|---|---:|---:|---|---|
| A | 20–30 | 500–900 | 5 decks, 3 environments | Validate workflow and training ingestion only |
| B | 100–150 | 2,500–4,500 | 20 decks, 8 environments, multiple people/devices | Initial transfer-learning proof of concept |
| C | 300+ | 7,500–10,000+ | Broad real-world coverage | Credible product evaluation |

Keep the original four photos out of training as an external historical benchmark. Split all other data by capture session/layout family, never by individual boxes.

## Throughput study

For at least five new photos, record `annotationStartedAt`, `annotationCompletedAt`, and review minutes. Measure metadata entry, logical boxes, optional top-card boxes, optional identities, review time, regions/minute, and corrections. Run localization-only and full-identity workflows on comparable photos. Do not estimate hours for 100 or 300 photos until these sessions exist.
