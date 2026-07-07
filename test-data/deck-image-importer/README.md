# Deck Image Importer Fixtures

Each fixture folder is designed for a paired deck image and expected TCGL-style
decklist:

- `digital.png` - a digital deck screenshot or exported deck image.
- `physical.jfif` - a physical deck photo of the same deck.
- `expected.txt` - the expected formatted decklist.
- `metadata.json` - optional objective metadata only.

Metadata should avoid subjective difficulty ratings. Use objective fields such
as `deckName`, `sourceTypes`, `expectedTotalCards`, `language`, and `notes`.

Recognition evaluation must not assume the image card order matches Pokemon /
Trainer / Energy output order. The expected decklist should still be grouped
for TCGL formatting, but recognition category assignment must come from card
identity, not image position.

The current recognition pipeline is scaffolding only. Images are not sent to any
external service.
