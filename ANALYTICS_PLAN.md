# Top Cut Analytics Plan

## Purpose

This document defines what Top Cut may measure before any analytics package,
SDK, or external provider is added.

Analytics are currently disabled. No analytics provider should be installed or
enabled until the tracking scope, provider, retention policy, consent
requirements, and privacy disclosures are intentionally reviewed.

## Analytics Philosophy

Top Cut should use analytics to understand broad product behavior, workflow
completion, reliability, and feature usefulness.

Analytics should:

- Answer specific product questions.
- Prefer aggregate behavior events over detailed user activity.
- Collect the minimum data needed for each question.
- Use controlled categories, booleans, and counts instead of raw text.
- Avoid persistent identity unless a future feature clearly requires it.
- Avoid reconstructing a player's deck, tournament history, or personal habits.
- Remain easy to disable or remove.

Analytics should not become a shadow copy of locally stored app data.

## Privacy-First Rules

1. Do not track decklist contents, card names, or card quantities.
2. Do not track opponent deck names or archetypes as raw text.
3. Do not track personal notes, event notes, or match notes.
4. Do not track imported or exported JSON contents.
5. Do not track deck names, event names, or other user-entered free text.
6. Do not transmit locally stored records as analytics properties.
7. Prefer aggregate counts, controlled enums, and completion states.
8. Do not collect precise location, contacts, advertising identifiers, or
   unrelated device data.
9. Do not add session replay, screen recording, or automatic DOM capture.
10. Keep analytics disabled until a provider is intentionally added.
11. Review every new event and property against this document before release.
12. Apply an appropriate retention period and deletion process when a provider
    is selected.

## Events To Track

Properties listed as safe are an allowlist. Properties not explicitly approved
should not be included without a privacy review.

### `app_opened`

- **Trigger:** The app finishes startup and local data hydration.
- **Safe properties:** `platform`, `app_version`, `is_first_launch`,
  `has_saved_decks`, `has_matches`, `has_events`.
- **Unsafe properties to avoid:** Device identifiers, IP-derived location,
  deck data, match data, event names, timestamps from individual records.

### `tab_changed`

- **Trigger:** The user selects a different primary navigation tab.
- **Safe properties:** `from_tab`, `to_tab`, using controlled tab identifiers.
- **Unsafe properties to avoid:** Content visible within either tab, user-entered
  values, navigation history beyond the immediate transition.

### `deck_created`

- **Trigger:** A valid deck is saved for the first time.
- **Safe properties:** `comfort_rating`, `archetype_detected` as a boolean,
  `saved_deck_count_bucket`.
- **Unsafe properties to avoid:** Deck name, decklist contents, archetype or
  variant as raw text, card names, card quantities.

### `deck_updated`

- **Trigger:** Changes to an existing saved deck are successfully saved.
- **Safe properties:** `comfort_changed`, `decklist_changed`,
  `name_changed`, all as booleans.
- **Unsafe properties to avoid:** Previous or new deck name, decklist contents,
  card-level changes, raw archetype or variant text.

### `deck_deleted`

- **Trigger:** The user confirms deletion of a saved deck.
- **Safe properties:** `remaining_deck_count_bucket`.
- **Unsafe properties to avoid:** Deleted deck name, decklist contents,
  archetype, variant, or any other deck record data.

### `match_logged`

- **Trigger:** A match or round is successfully saved.
- **Safe properties:** `match_type`, `result`, `round_number_bucket`,
  `has_notes` as a boolean, `event_type` as a controlled enum.
- **Unsafe properties to avoid:** Opponent deck name as raw text, personal
  notes, event name, saved deck name, game-by-game free text.

### `event_created`

- **Trigger:** A new event is successfully created.
- **Safe properties:** `event_type`, `format` as a controlled enum,
  `player_count_bucket`, `has_saved_deck`.
- **Unsafe properties to avoid:** Event name, deck name, exact venue, location,
  personal notes, exact participant data.

### `event_completed`

- **Trigger:** The user records event completion or final event results.
- **Safe properties:** `event_type`, `round_count_bucket`,
  `placement_bucket`, `has_prizing` as a boolean,
  `has_championship_points` as a boolean.
- **Unsafe properties to avoid:** Event name, exact placement when identifying,
  exact prizing text or value, personal notes, opponent information.

### `advisor_opened`

- **Trigger:** The Advisor tab or Advisor setup is opened.
- **Safe properties:** `has_saved_decks`, `has_event_setup`,
  `candidate_source` as a controlled enum.
- **Unsafe properties to avoid:** Saved deck names, expected archetype names,
  decklists, matchup records, recommendation contents.

### `advisor_recommendation_viewed`

- **Trigger:** At least one Advisor recommendation is rendered and viewed.
- **Safe properties:** `candidate_source`, `candidate_count_bucket`,
  `meta_entry_count_bucket`, `event_size_bucket`.
- **Unsafe properties to avoid:** Recommended deck name, archetype names,
  matchup details, decklists, exact ranking scores.

### `sample_data_loaded`

- **Trigger:** The user confirms loading sample data.
- **Safe properties:** `sample_version`, `replaced_existing_data` as a boolean.
- **Unsafe properties to avoid:** Sample records, current user records, imported
  content, or any serialized data.

### `import_started`

- **Trigger:** The user selects or initiates a data import.
- **Safe properties:** `source` as a controlled enum when known.
- **Unsafe properties to avoid:** File name, file path, JSON contents, record
  contents, device storage details.

### `import_completed`

- **Trigger:** An import finishes successfully.
- **Safe properties:** `source` as a controlled enum, `deck_count_bucket`,
  `match_count_bucket`, `event_count_bucket`.
- **Unsafe properties to avoid:** Imported JSON contents, decklists, names,
  notes, opponent data, exact record payloads.

### `export_completed`

- **Trigger:** A data export is successfully created.
- **Safe properties:** `deck_count_bucket`, `match_count_bucket`,
  `event_count_bucket`.
- **Unsafe properties to avoid:** Exported JSON contents, file name, file path,
  decklists, names, notes, or record payloads.

## Events Not To Track

Top Cut should not track:

- Individual input keystrokes or field-level text changes.
- Decklist pastes, card searches, card names, or deck contents.
- Raw deck, archetype, variant, opponent, or event names.
- Match notes, event notes, personal notes, or clipboard contents.
- Imported or exported JSON contents.
- Detailed user navigation trails or screen recordings.
- Every swipe, scroll, hover, focus, or disclosure interaction.
- Exact timestamps for individual matches or events unless operationally
  required and separately reviewed.
- Precise location or venue information.
- Crash logs containing localStorage values, form contents, or exported data.
- Persistent cross-app advertising or fingerprinting identifiers.

## Property Design Guidelines

- Use bounded enums instead of arbitrary strings.
- Use booleans for presence or completion states.
- Bucket counts and numeric values when exact values are unnecessary.
- Never place sensitive or user-entered data in event names.
- Never send whole objects, arrays of records, or serialized storage values.
- Document the product question supported by every new property.
- Remove events that no longer support an active product decision.

## Future Analytics Provider Notes

Before selecting a provider, evaluate:

- Data collection defaults and automatic capture behavior.
- Ability to disable automatic screen, DOM, text, and form capture.
- Data residency, subprocessors, encryption, and retention controls.
- Anonymous or pseudonymous usage without advertising identifiers.
- Deletion, export, and opt-out support.
- SDK size, performance impact, offline behavior, and native compatibility.
- Support for development and production environment separation.
- Ability to enforce a strict event and property allowlist.

The initial integration should:

1. Keep analytics disabled by default in code until configuration is approved.
2. Use one small internal analytics wrapper rather than provider calls spread
   throughout components.
3. Reject unknown event names and properties during development.
4. Avoid automatic collection features.
5. Include a documented kill switch.
6. Verify production payloads before release.

## Required Documentation Updates

Adding analytics requires reviewing and updating:

- The Privacy Policy.
- The App Store privacy questionnaire.
- Support documentation, if analytics behavior or user controls need to be
  explained.

These updates must be completed before an analytics-enabled release is
submitted or distributed.
