# UI Components Inventory

## Source Notes

This inventory is based on the current application code in `src/app/page.tsx`
and `src/components/*`, plus the project goals in `PROJECT_SPEC.md` and the
visual direction in `DESIGN_SYSTEM.md`.

The design system currently establishes these working principles:

* Premium, modern, fast, tactical, and highly usable.
* Competitive-player focused, especially local tournament grinders and
  regional/worlds competitors.
* Minimal Pokemon IP theming; avoid corny or generic game-app styling.
* Dark background, white text, blue highlights, softened gray depth layers.
* Success/warning/error colors used sparingly for outcome meaning.
* Mobile-first, portrait-first, thumb-reachable workflows.
* Apple-like smoothness, glass/elevated cards, and clear large controls.
* Reduce visual clutter while keeping deeper data available when needed.
* Prioritize quick input, readable outputs, and between-round efficiency.

This is not a redesign proposal. It is an inventory and refactor-planning
document for the UI that exists today.

---

## App Shell

### Main App Container

**Current location:** `src/app/page.tsx`

**Purpose**

Owns top-level application state and switches between the five main feature
areas: Decks, Compare, Matches, History, and Advisor. It also owns localStorage
persistence for saved decks and match history.

**States**

* Active tab.
* Saved decks loaded or empty.
* Match history loaded or empty.
* Editing deck.
* Editing match.
* Editing event.
* Temporary save, round, event, and clear success states.

**Mobile Behavior**

Single-column feature flow with bottom padding to avoid the fixed bottom
navigation.

**Expanded / Collapsed Behavior**

The shell conditionally mounts one feature area at a time. It does not have an
internal expanded/collapsed state.

**Motion Behavior**

Tab buttons change opacity for active and inactive states. Child components use
scale, pulse, shake, and hover transitions.

**Interaction Patterns**

Bottom navigation controls the active feature area. Top-level state persists
while switching tabs.

**Recommendation**

Redesign later as a true app shell with extracted feature containers. Before a
larger UI overhaul, move state-heavy workflows out of `page.tsx`.

---

## Navigation

### Bottom Tab Navigation

**Current location:** inline in `src/app/page.tsx`

**Purpose**

Provides persistent navigation between Decks, Compare, Matches, History, and
Advisor.

**States**

* Active tab: full opacity.
* Inactive tab: reduced opacity.
* Hover: increased opacity.

**Mobile Behavior**

Fixed to the bottom of the viewport with five equal columns. This is the main
mobile navigation pattern.

**Expanded / Collapsed Behavior**

None.

**Motion Behavior**

Opacity transition on hover and active state.

**Interaction Patterns**

Icon-only buttons for the first four tabs, text-only button for Advisor.

**Recommendation**

Redesign for consistency. Advisor should use an icon or the other tabs should
use text+icon labels.

### Nav Icon Components

**Current location:** `src/components/NavIcons.tsx`

**Purpose**

Defines inline SVG icon components for Deck, Compare, Log, and History.

**States**

None internally.

**Mobile Behavior**

Depends on parent sizing via `className`.

**Expanded / Collapsed Behavior**

None.

**Motion Behavior**

None internally.

**Interaction Patterns**

Pure display components.

**Recommendation**

Currently unused. Either merge into the bottom navigation and remove static
`public/icons/*.svg` usage, or remove these components.

---

## Deck Management

### Add Deck Form

**Current location:** `src/components/AddDeckForm.tsx`

**Purpose**

Allows users to enter a deck name and paste a decklist. Also supports updating
an existing deck when `editingDeckId` is set.

**States**

* Empty form.
* Filled form.
* Editing existing deck.
* Textarea collapsed.
* Textarea expanded.

**Mobile Behavior**

Single card panel with full-width text input and textarea. Action buttons are
two columns.

**Expanded / Collapsed Behavior**

The decklist textarea toggles between a fixed collapsed height and an expanded
auto-resized height based on content.

**Motion Behavior**

Textarea has transition styling. Save button has a small hover scale.

**Interaction Patterns**

* Text input for deck name.
* Textarea for decklist.
* Toggle button for expand/collapse.
* Save/update button.

**Recommendation**

Keep as a distinct feature component, but use shared primitives for panel,
input, textarea, and action buttons.

### Saved Decks

**Current location:** `src/components/SavedDecks.tsx`

**Purpose**

Displays all saved decks, allows selecting a deck for viewing, and exposes edit
and delete actions.

**States**

* Empty state: no decks saved.
* Default deck row.
* Selected deck row.
* Hover over deck name.

**Mobile Behavior**

Rows are compact and use a horizontal layout with deck info on the left and
actions on the right.

**Expanded / Collapsed Behavior**

None.

**Motion Behavior**

Selected row scales slightly and shows a blue glow. Selected row also shows a
pulsing "Viewing" label.

**Interaction Patterns**

* Click row content to select.
* Edit button starts editing in Add Deck Form.
* Delete button removes the deck.

**Recommendation**

Keep, but reduce motion intensity during future polish. The selected-row scale
can cause layout movement on small screens.

### Deck Viewer

**Current location:** `src/components/DeckViewer.tsx`

**Purpose**

Shows the selected deck name and full decklist.

**States**

* Empty state: no deck selected.
* Viewing selected deck.

**Mobile Behavior**

Full-width panel with scrollable/pre-wrapped decklist text.

**Expanded / Collapsed Behavior**

None.

**Motion Behavior**

None.

**Interaction Patterns**

Read-only display.

**Recommendation**

Keep. It could later share a `CodeBlock` or `TextBlock` primitive with match
notes and source panels.

---

## Deck Comparison

### Compare Decks

**Current location:** `src/components/CompareDecks.tsx`

**Purpose**

Allows users to select two saved decks and view card count differences.

**States**

* No decks selected.
* One deck selected.
* Two decks selected with no differences.
* Two decks selected with differences.

**Mobile Behavior**

Uses a full-height layout with top controls and a scrollable differences panel.

**Expanded / Collapsed Behavior**

None.

**Motion Behavior**

None beyond inherited hover/focus styles.

**Interaction Patterns**

* Two select controls.
* Difference rows with old quantity, new quantity, and signed diff.
* Green text for additions.
* Red text for removals.

**Recommendation**

Keep as a feature component. Extract reusable `SelectField`,
`ScrollablePanel`, and `DeltaRow` primitives later.

---

## Match Logging

### Match Logger

**Current location:** `src/components/MatchLogger.tsx`

**Purpose**

Captures tournament match data: event, format, player deck, opponent deck, BO1
or BO3 mode, game results, starting choice, and notes.

**States**

* Blank match form.
* Invalid required fields.
* BO1 mode.
* BO3 mode.
* Game result sequence in progress.
* Save success.
* Clear success.
* New event success.
* Next round success.

**Mobile Behavior**

Optimized as a stacked mobile form. Some controls use two-column grids for
paired actions and related fields.

**Expanded / Collapsed Behavior**

Match notes textarea grows as the user types. Game rows expand from one visible
slot up to three depending on BO1/BO3 and current results.

**Motion Behavior**

Invalid fields use a shake animation. Success states change button labels
temporarily. Device vibration is used where available.

**Interaction Patterns**

* Inputs and selects for structured match metadata.
* Segmented control for BO1/BO3.
* Large action buttons for Win, Loss, Tie, and Clear.
* Per-game start toggle between first and second.

**Recommendation**

Keep, but eventually split into smaller pieces: event controls, match detail
fields, match type control, game result picker, notes field, and form action
bar.

---

## Match History

### Match History

**Current location:** `src/components/MatchHistory.tsx`

**Purpose**

Groups saved matches by event, displays event record and individual round
history, and supports editing/deleting events and rounds.

**States**

* Empty state: no matches logged.
* Event display mode.
* Event edit mode.
* Event menu open.
* Round display mode.
* Round edit mode.
* Round menu open.
* Notes collapsed.
* Notes expanded.
* Invalid round during edit.

**Mobile Behavior**

Cards are stacked by event. Each round uses a dense mobile row with opponent
deck on the left and result/running record/menu on the right.

**Expanded / Collapsed Behavior**

* Event edit panel expands in place.
* Round edit panel expands in place.
* Notes expand below a round only when requested.
* Menus open as small popovers.

**Motion Behavior**

Hover transitions on menu buttons and actions. No large entrance/exit motion.

**Interaction Patterns**

* Kebab-style menu for event actions.
* Kebab-style menu for round actions.
* Backdrop button closes open menus.
* Inline editing for event and round data.
* Game result buttons cycle W/L/T while editing.

**Recommendation**

Redesign later. First split into `EventHistoryCard`, `EventEditForm`,
`RoundHistoryRow`, `RoundEditForm`, `OverflowMenu`, and `NotesDisclosure`.

---

## Deck Advisor

### Deck Advisor Container

**Current location:** `src/components/DeckAdvisor.tsx`

**Purpose**

Helps users decide what deck to play for an expected tournament field by
combining expected meta shares, matchup data, and player comfort.

**States**

* Empty expected meta.
* Suggested meta loaded.
* Percent input mode.
* Players input mode.
* Event setup with or without estimated player count.
* Owned Decks advisor mode.
* Top Meta advisor mode.
* No recommendations.
* Recommendations available.

**Mobile Behavior**

Single stacked panel. Uses full-width sections and compact summary cards.

**Expanded / Collapsed Behavior**

No formal disclosure component. Sections appear conditionally:

* Tournament Structure appears only when estimated players is greater than 0.
* Owned Decks comfort/matchup controls appear only in Owned Decks mode.
* Meta Breakdown appears only when meta rows have valid values.

**Motion Behavior**

Hover state on buttons. Matchup cards use color-coded background/borders. No
animated transitions for section changes.

**Interaction Patterns**

* Event type select.
* Estimated players numeric input.
* Use Suggested Meta action.
* Source transparency panel.
* Percent/Players segmented control.
* Dynamic meta rows with archetype select, share input, and clear action.
* Advisor mode segmented control.
* Comfort sliders for saved decks.
* Recommendation cards ranked by final score.

**Recommendation**

Do not redesign yet. Split before redesign because this component is too large.
Proposed internal components: `AdvisorEventSetup`,
`TournamentStructureSummary`, `ExpectedMetaEditor`, `DataSourcePanel`,
`AdvisorModeControl`, `OwnedDeckComfortList`, `MatchupRateList`,
`RecommendationCard`, `MatchupSummaryPanel`, and `MetricTile`.

### Tournament Structure Summary

**Current location:** inline in `DeckAdvisor.tsx`

**Purpose**

Shows derived tournament structure from event type and estimated player count.

**States**

* Hidden when player count is empty or zero.
* Challenge structure.
* Cup structure.
* Regional structure without phase split.
* Regional structure with phase split.

**Mobile Behavior**

Compact text list inside a dark nested panel.

**Expanded / Collapsed Behavior**

Conditional visibility only.

**Motion Behavior**

None.

**Interaction Patterns**

Read-only summary.

**Recommendation**

Extract as a dedicated summary component.

### Expected Meta Editor

**Current location:** inline in `DeckAdvisor.tsx`

**Purpose**

Lets users define the expected tournament field by archetype and percentage or
player count.

**States**

* Manual empty row.
* Suggested meta loaded.
* Percent mode.
* Players mode.
* One or many meta rows.
* Other meta share present.
* Meta breakdown visible.

**Mobile Behavior**

Each meta row stacks archetype select above share input and clear button.

**Expanded / Collapsed Behavior**

Rows are added or removed dynamically. Meta Breakdown appears only with valid
rows.

**Motion Behavior**

Button hover states only.

**Interaction Patterns**

* Suggested meta button replaces current rows with suggested values.
* Percent/Players segmented control changes input interpretation.
* Add Meta Deck appends a row.
* Clear removes a row or resets to one empty row.

**Recommendation**

Extract. This is one of the highest-value reusable workflow components.

### Data Source Panel

**Current location:** inline in `DeckAdvisor.tsx`

**Purpose**

Displays Meta Source and Matchup Source.

**States**

* Static matchup source.
* Dynamic suggested meta source label.

**Mobile Behavior**

Compact two-row panel with labels left and values right.

**Expanded / Collapsed Behavior**

None.

**Motion Behavior**

None.

**Interaction Patterns**

Read-only.

**Recommendation**

Keep compact. Later, it can support tap-to-view event source details.

### Owned Deck Comfort List

**Current location:** inline in `DeckAdvisor.tsx`

**Purpose**

Shows saved decks as advisor candidates and lets users edit comfort ratings.

**States**

* Empty state: no saved decks.
* One or more saved decks.
* Comfort values from localStorage or default 3.
* Matchup rates unavailable until expected meta is entered.
* Matchup rates shown once expected meta exists.

**Mobile Behavior**

Stacked cards, one per saved deck.

**Expanded / Collapsed Behavior**

Only visible in Owned Decks mode.

**Motion Behavior**

None beyond matchup color coding.

**Interaction Patterns**

* Range slider for comfort.
* Read-only matchup cards against expected meta.

**Recommendation**

Extract. This should not remain embedded in the advisor container.

### Recommendation Card

**Current location:** inline in `DeckAdvisor.tsx`

**Purpose**

Displays a ranked deck recommendation with score, insight, metrics, field
coverage, best matchups, and worst matchups.

**States**

* Ranked position.
* Positive/neutral/negative comfort impact.
* Unknown field coverage.
* Known field coverage.
* No favorable sampled matchups.
* Favorable sampled matchups.
* No unfavorable sampled matchups.
* Unfavorable sampled matchups.

**Mobile Behavior**

Stacked card layout. Metric tiles use a two-column grid on small screens and
four columns on wider screens.

**Expanded / Collapsed Behavior**

None.

**Motion Behavior**

None.

**Interaction Patterns**

Read-only.

**Recommendation**

Extract and reuse `MetricTile` and `MatchupSummaryPanel` primitives.

---

## Shared Primitives To Reuse Across The App

### Layout And Surfaces

* `Panel`
* `NestedPanel`
* `SectionHeader`
* `ScrollablePanel`

### Forms

* `TextInput`
* `NumberInput`
* `SelectField`
* `TextareaField`
* `RangeField`

### Actions

* `Button`
* `IconButton`
* `SegmentedControl`
* `ActionBar`

### Feedback

* `EmptyState`
* `StatusBadge`
* `ResultPill`
* `ValidationMessage`
* `MatchupBadge`

### Data Display

* `MetricRow`
* `MetricTile`
* `KeyValueList`
* `DeltaRow`
* `SourcePanel`

### Overlays And Disclosure

* `OverflowMenu`
* `MenuItem`
* `DismissLayer`
* `NotesDisclosure`

---

## Components To Merge, Remove, Or Redesign

### Merge Or Standardize

* Percent/Players, BO1/BO3, and Owned/Top Meta controls should share one
  segmented-control primitive.
* Repeated panel/card shells should use one panel primitive.
* Repeated field styling should use field primitives.
* Repeated destructive/edit buttons should use one button primitive.

### Remove Or Replace

* `NavIcons.tsx` should either be used by bottom navigation or removed.
* Static bottom-nav SVG images and inline icon components should not both exist
  long term.
* The text-only Advisor nav item should be replaced or standardized during nav
  polish.

### Redesign Later

* Match History should be redesigned after it is split into smaller components.
* Deck Advisor should be redesigned after it is split into smaller components.
* Bottom navigation should be redesigned for consistent icon/label treatment.
* Saved Deck selected-state motion should be reconsidered to reduce layout
  shift.

---

## Suggested Extraction Order

1. Shared primitives: `Panel`, `Button`, `TextInput`, `SelectField`,
   `TextareaField`, `SegmentedControl`.
2. Match History internals: event card, round row, edit forms, overflow menu.
3. Deck Advisor internals: event setup, meta editor, comfort list,
   recommendation card.
4. Bottom navigation.
5. Visual polish pass after behavior is componentized.

---

## Non-Goals For This Document

* No new visual design.
* No new layouts.
* No behavior changes.
* No recommendation formula changes.
* No component implementation yet.

### AppShell

Purpose:
Own overall application layout.

Contains:
- Top safe area
- Main content
- Bottom navigation
- Overlay layer

Behavior:
- Prevent unwanted scrolling
- Handle mobile safe areas
- Manage swipe navigation
