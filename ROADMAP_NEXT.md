# Roadmap Next

Near-term roadmap notes for Top Cut.

## Post-V1 / Experimental

### Deck Photo Import

The decklist-from-picture importer is shelved for beta and V1. It is not a V1
launch dependency. Recognition code, fixtures, annotations, reference caches,
benchmarks, evaluators, dataset tooling, and developer tools remain active
development infrastructure for a later release.

The following work is explicitly post-V1 and does not block launch:

- Physical recognition accuracy and recognition QA
- Additional training-photo collection and model training
- Physical stack counting and perspective handling
- Card identity and quantity-recognition improvements
- Multilingual and Japanese image recognition

Re-enable the user-facing importer in an intentional build with
`NEXT_PUBLIC_ENABLE_DECK_PHOTO_IMPORT=true`. Developer-only tools retain their
own existing access restrictions.
