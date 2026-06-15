# UI Component Specs

## Source Of Truth

These specs are based on `PROJECT_SPEC.md`, `DESIGN_SYSTEM.md`, and
`UI_COMPONENTS.md`.

The design direction is premium, modern, fast, tactical, and highly usable.
The app should prioritize competitive players, especially local tournament
grinders using a phone between rounds. Interfaces should feel dark, clean,
smooth, data-driven, and Apple-adjacent without becoming generic or corny.

These specs describe target component behavior. They are not implementation
instructions for the current sprint.

---

## App Shell

### Purpose

Owns the main app frame, persistent navigation, feature routing, top-level data
ownership, and safe mobile spacing.

### Collapsed State

Only the active feature surface is visible. Inactive feature areas are hidden
behind navigation.

### Expanded State

The active feature owns the full available main content area. Future overlays,
menus, and sheets should layer above the shell rather than pushing the app
around.

### Mobile Behavior

Primary layout is portrait-first. Main content should avoid being blocked by
the floating bottom navigation and should respect mobile safe areas.

### Motion Behavior

Feature changes should feel smooth and restrained. Navigation state changes may
use short opacity, blur, or slide transitions, but should never delay between-
round input.

### Interaction Patterns

Users move between major tools through bottom navigation. Feature state should
remain stable when switching tabs.

### Shared Primitives Used

`Panel`, `DismissLayer`, `ActionBar`, `FloatingBottomNavigation`.

---

## Floating Bottom Navigation

### Purpose

Provides persistent access to Decks, Compare, Matches, History, and Advisor.

### Collapsed State

The nav remains compact, fixed near the bottom, and shows only primary tab
actions.

### Expanded State

No expanded state is required. Future versions may support swipe navigation or
labels when space allows.

### Mobile Behavior

Designed for thumb reach on iPhone portrait screens. Targets must be large
enough for fast tournament use.

### Motion Behavior

Active tab changes should use subtle opacity, scale, blur, or background
treatment. Avoid motion that causes layout shift.

### Interaction Patterns

Tap a tab to switch feature areas. Active state must be obvious at a glance.
Icon and label treatment should be consistent across all tabs.

### Shared Primitives Used

`IconButton`, `StatusBadge`, `FloatingSurface`.

---

## Navigation Icon Set

### Purpose

Provides recognizable visual symbols for primary app destinations.

### Collapsed State

Icons render without labels when used in the compact bottom nav.

### Expanded State

Icons may pair with short labels in wider or future native layouts.

### Mobile Behavior

Icons should remain legible at small sizes and avoid fine detail.

### Motion Behavior

Icons inherit nav button motion and should not animate independently unless
used for a clear state change.

### Interaction Patterns

Pure display inside buttons. The parent control owns tap, hover, focus, and
active states.

### Shared Primitives Used

`IconButton`, `TooltipLabel`.

---

## Add Deck Form

### Purpose

Allows users to save or update a named decklist.

### Collapsed State

The decklist field uses a compact height that keeps the form scannable.

### Expanded State

The decklist field expands to support review and editing of the full list.

### Mobile Behavior

Single-column, full-width inputs. Action buttons should be large enough for
phone use and should keep the save/update action easy to reach.

### Motion Behavior

Textarea expansion should be smooth but quick. Save/update feedback should be
clear without using excessive animation.

### Interaction Patterns

Users enter a deck name, paste a decklist, optionally expand the textarea, then
save or update. Editing mode should be visually distinct from creating mode.

### Shared Primitives Used

`Panel`, `TextInput`, `TextareaField`, `Button`, `ActionBar`,
`ValidationMessage`.

---

## Saved Decks List

### Purpose

Displays saved decks and provides select, edit, and delete actions.

### Collapsed State

Each deck appears as a compact row with deck identity and actions.

### Expanded State

No formal expanded state. The selected deck is represented by selection state,
not by expanding the row.

### Mobile Behavior

Rows should stay compact and avoid shifting when selected. Actions should be
easy to tap without crowding the deck name.

### Motion Behavior

Selection feedback should be subtle. Avoid scale effects that move surrounding
content on small screens.

### Interaction Patterns

Tap a deck row to view it. Use explicit edit and delete controls for mutations.
Destructive actions should remain visually distinct.

### Shared Primitives Used

`Panel`, `ListRow`, `IconButton`, `StatusBadge`, `EmptyState`.

---

## Deck Viewer

### Purpose

Displays the selected deck name and full decklist in a readable format.

### Collapsed State

When no deck is selected, show a compact empty state.

### Expanded State

When a deck is selected, show the full decklist in a scrollable or pre-wrapped
text area.

### Mobile Behavior

Deck text must remain readable without horizontal scrolling. Long lists should
scroll within a stable surface when needed.

### Motion Behavior

No dedicated motion required.

### Interaction Patterns

Read-only display. Selection is controlled by the Saved Decks List.

### Shared Primitives Used

`Panel`, `ScrollablePanel`, `TextBlock`, `EmptyState`.

---

## Compare Decks

### Purpose

Lets users compare two saved decklists and review card count differences.

### Collapsed State

Shows deck selectors and an empty or instructional comparison area when two
decks are not selected.

### Expanded State

Shows difference rows once both decks are selected.

### Mobile Behavior

Selectors stack cleanly. Difference rows must be scannable, with additions and
removals distinguishable without relying only on dense text.

### Motion Behavior

No major motion required. Difference results may appear with subtle opacity
transitions.

### Interaction Patterns

Select deck A and deck B. Review added, removed, and changed card counts.

### Shared Primitives Used

`Panel`, `SelectField`, `ScrollablePanel`, `DeltaRow`, `EmptyState`.

---

## Match Logger

### Purpose

Captures tournament round data quickly: event, round, format, player deck,
opponent deck, BO1/BO3, game results, first/second, and notes.

### Collapsed State

Shows the current round form with only necessary fields and active game result
controls.

### Expanded State

BO3 mode reveals up to three game slots. Notes expand as users type. Future
autosuggest fields may expand into suggestion lists.

### Mobile Behavior

This is a primary between-round workflow. Inputs should use appropriate mobile
keyboards, large controls, autocomplete where possible, and a smooth path from
field to field.

### Motion Behavior

Validation and success feedback should be immediate and restrained. Shake or
vibration can indicate invalid fields, but must not feel disruptive.

### Interaction Patterns

Users complete structured fields, choose BO1/BO3, tap W/L/T game buttons,
toggle first/second, add optional notes, then save, advance round, or start a
new event.

### Shared Primitives Used

`Panel`, `TextInput`, `NumberInput`, `SelectField`, `SegmentedControl`,
`ResultPill`, `TextareaField`, `ActionBar`, `Button`, `ValidationMessage`.

---

## Game Result Picker

### Purpose

Captures game-level W/L/T results and play/draw order for a match.

### Collapsed State

BO1 displays one game row. BO3 displays only currently relevant game rows.

### Expanded State

Additional game rows appear as the match progresses or when editing existing
BO3 records.

### Mobile Behavior

Buttons must be large and separated enough for rapid input. Result state should
be visually obvious.

### Motion Behavior

Result changes can use short press feedback. Avoid long animations because this
is a high-frequency input area.

### Interaction Patterns

Tap W, L, or T for each game. Toggle whether the player went first or second.
Clear actions reset mistakes.

### Shared Primitives Used

`SegmentedControl`, `ResultPill`, `IconButton`, `Button`.

---

## Match History

### Purpose

Shows logged matches grouped by event and supports review, editing, and
deletion.

### Collapsed State

Events appear as stacked summary cards with compact round rows. Notes are
hidden unless requested.

### Expanded State

Event edit forms, round edit forms, notes, and action menus expand in place.

### Mobile Behavior

History must be digestible at a glance. Event record, opponent deck, match
result, first/second, and notes access should remain concise on phone screens.

### Motion Behavior

Menu and disclosure transitions should be quick and grounded. Avoid large card
movement while scrolling history.

### Interaction Patterns

Use event and round menus for edit/delete actions. Tap notes to reveal details.
Inline edit controls should preserve the surrounding event context.
Primary Action:
Swipe left

Reveal:
[ Edit ] [ Delete ]

Secondary:
Overflow menu

### Shared Primitives Used

`Panel`, `NestedPanel`, `OverflowMenu`, `MenuItem`, `DismissLayer`,
`NotesDisclosure`, `ResultPill`, `Button`, `SelectField`, `TextareaField`.

---

## Event History Card

### Purpose

Summarizes one tournament or play session and contains its rounds.

### Collapsed State

Shows event name, record, deck, format, and compact round list.

### Expanded State

Shows event editing controls or detailed round content when those child states
are active.

### Mobile Behavior

Event identity and record should be the strongest signals. Secondary metadata
should not crowd round results.

### Motion Behavior

Opening menus or edit mode should not jump scroll position.

### Interaction Patterns

Event menu opens edit/delete actions. Child round rows handle round-specific
actions.

### Shared Primitives Used

`Panel`, `SectionHeader`, `MetricRow`, `OverflowMenu`, `MenuItem`.

---

## Round History Row

### Purpose

Displays one logged match round inside an event.

### Collapsed State

Shows round number, opponent deck, result, running record, and action access.

### Expanded State

Can reveal notes or an inline edit form.

### Mobile Behavior

Opponent deck and result should be readable at a glance. Menus should not
overlap important round data.

### Motion Behavior

Disclosure should use subtle height or opacity motion.

### Interaction Patterns

Tap menu for edit/delete. Tap notes control to show or hide notes.

### Shared Primitives Used

`NestedPanel`, `ResultPill`, `OverflowMenu`, `NotesDisclosure`,
`KeyValueList`.

---

## Deck Advisor Container

### Purpose

Helps answer: "Given this expected field, what should I play?"

### Collapsed State

Shows event setup, source context, expected meta controls, advisor mode, and
recommendations only when enough data exists.

### Expanded State

Conditional sections appear for tournament structure, meta breakdown, owned
deck comfort, matchup details, and recommendation details.

### Mobile Behavior

This is the flagship page. It should show enough to make an educated choice
without clutter. The order should favor tournament structure, expected meta,
recommended owned decks, sources, and then deeper scoring detail.

### Motion Behavior

Section changes should be smooth but restrained. Recommendation ranking changes
should avoid distracting movement.

### Interaction Patterns

Users configure tournament context, load or edit expected meta, choose Owned
Decks or Top Meta mode, adjust comfort, and review ranked recommendations.

### Shared Primitives Used

`Panel`, `NestedPanel`, `SectionHeader`, `SegmentedControl`, `MetricTile`,
`SourcePanel`, `Button`, `SelectField`, `NumberInput`.

---

## Advisor Event Setup

### Purpose

Captures event type and estimated player count for tournament structure
context.

### Collapsed State

Shows event type and player count controls.

### Expanded State

Reveals tournament structure summary when player count is available.

### Mobile Behavior

Inputs should be compact and easy to change without pushing recommendations
too far down the page.

### Motion Behavior

Tournament summary can appear with subtle opacity or height transition.

### Interaction Patterns

Select event type and enter estimated players. Derived structure updates
automatically.

### Shared Primitives Used

`SelectField`, `NumberInput`, `TournamentStructureSummary`.

---

## Tournament Structure Summary

### Purpose

Shows derived tournament structure based on event type and player count.

### Collapsed State

Hidden when there is no meaningful player estimate.

### Expanded State

Displays round count, top cut expectations, and any relevant phase split.

### Mobile Behavior

Compact, readable, and secondary to the recommendation flow.

### Motion Behavior

No major motion needed.

### Interaction Patterns

Read-only derived data.

### Shared Primitives Used

`NestedPanel`, `MetricRow`, `KeyValueList`.

---

## Expected Meta Editor

### Purpose

Lets users define the expected field by archetype and share.

### Collapsed State

Shows current meta rows, input mode, and suggested meta action.

### Expanded State

Additional rows and meta breakdown appear as users add expected archetypes.

### Mobile Behavior

Rows should stack cleanly with archetype, share, and clear action. Percent and
players modes should be obvious.

### Motion Behavior

Adding/removing rows should feel quick and stable. Avoid reordering surprises.

### Interaction Patterns

Load suggested meta, switch percent/players mode, edit shares, add rows, and
clear rows.

### Shared Primitives Used

`Panel`, `SegmentedControl`, `SelectField`, `NumberInput`, `IconButton`,
`Button`, `MetricRow`.

---

## Data Source Panel

### Purpose

Shows transparency for Meta Source and Matchup Source.

### Collapsed State

Compact two-row source summary.

### Expanded State

No current expanded state. Future versions may reveal included event details.

### Mobile Behavior

Small and readable near Suggested Meta and Recommendations. It should not
compete visually with the recommendation ranking.

### Motion Behavior

No motion required.

### Interaction Patterns

Read-only for now.

### Shared Primitives Used

`SourcePanel`, `KeyValueList`, `NestedPanel`.

---

## Advisor Mode Control

### Purpose

Switches Deck Advisor between Owned Decks and Top Meta modes.

### Collapsed State

Shows two compact mode options.

### Expanded State

The selected mode reveals its relevant downstream sections.

### Mobile Behavior

Large enough for touch, compact enough to keep recommendation context visible.

### Motion Behavior

Mode selection should use clear active-state feedback.

### Interaction Patterns

Tap Owned Decks to evaluate saved decks. Tap Top Meta to rank top expected meta
archetypes with neutral comfort.

### Shared Primitives Used

`SegmentedControl`, `StatusBadge`.

---

## Owned Deck Comfort List

### Purpose

Shows saved decks as automatic advisor candidates and lets users edit comfort
per saved deck.

### Collapsed State

Shows each saved deck with comfort rating control. If no saved decks exist,
shows an empty state.

### Expanded State

When expected meta exists, matchup rows for each owned deck can appear below
the comfort control.

### Mobile Behavior

One card per deck. Comfort sliders must be easy to adjust without accidental
horizontal page movement.

### Motion Behavior

No major motion needed. Matchup color changes should be immediate.

### Interaction Patterns

Adjust comfort with a range control. Review matchup rates against expected
field entries.

### Shared Primitives Used

`NestedPanel`, `RangeField`, `MatchupBadge`, `EmptyState`, `MetricRow`.

---

## Recommendation Card

### Purpose

Displays a ranked deck recommendation with field win rate, comfort impact,
final score, field coverage, best matchups, and worst matchups.

### Collapsed State

Shows rank, deck identity, insight, and top-line metrics.

### Expanded State

Displays deeper matchup summaries and field coverage details. Current UI shows
these inline; future versions may make details discloseable.

### Interaction
Tap = Expand

Long Press = Quick Preview

### Mobile Behavior

Must remain easy to compare across recommendations. Metric tiles should stack
or grid without wrapping awkwardly.

### Motion Behavior

Cards should not reshuffle with distracting animation during input changes.
Ranking changes may use subtle position or opacity treatment later.

### Interaction Patterns

Read-only decision support. Users compare recommendations and inspect matchup
strengths/weaknesses.

### Shared Primitives Used

`Panel`, `MetricTile`, `StatusBadge`, `MatchupBadge`,
`MatchupSummaryPanel`, `KeyValueList`.

---

## Matchup Summary Panel

### Purpose

Shows best and worst sampled matchups for a recommended deck.

### Collapsed State

Shows top favorable and unfavorable matchups, or a concise unavailable state.

### Expanded State

Future versions may disclose more matchups or sample-size context.

### Mobile Behavior

Matchup chips should remain readable, with color used sparingly for meaning.

### Motion Behavior

No major motion required.

### Interaction Patterns

Read-only. Color communicates favored, neutral, or unfavored.

### Shared Primitives Used

`NestedPanel`, `MatchupBadge`, `EmptyState`, `MetricRow`.

---

## Shared Primitive Specs

### Panel

Purpose: Primary glass/elevated surface for feature sections.
Mobile behavior: Full-width or near full-width with compact padding.
Motion behavior: Can support subtle hover or focus, but should not jump layout.

### NestedPanel

Purpose: Secondary surface inside a larger feature panel.
Mobile behavior: Use sparingly to avoid card-within-card clutter.
Motion behavior: Minimal.

### SectionHeader

Purpose: Labels a section without consuming excessive vertical space.
Mobile behavior: Clear but compact.
Motion behavior: None.

### Button

Purpose: Primary, secondary, and destructive actions.
Mobile behavior: Large touch targets, clear hierarchy.
Motion behavior: Short press/hover feedback only.

### IconButton

Purpose: Compact actions such as edit, delete, clear, menu, or navigation.
Mobile behavior: Minimum touch size should remain comfortable.
Motion behavior: Subtle active state.

### SegmentedControl

Purpose: Binary or small option-set choices like BO1/BO3, percent/players, and
advisor mode.
Mobile behavior: Equal-width options where possible.
Motion behavior: Smooth active indicator.

### Form Fields

Purpose: Text, number, select, textarea, and range inputs.
Mobile behavior: Correct keyboard type, clear labels, autocomplete where useful,
and fast next-field movement.
Motion behavior: Focus states should be visible but not loud.

### OverflowMenu

Purpose: Compact secondary actions for events and rounds.
Mobile behavior: Must stay within viewport and close predictably.
Motion behavior: Quick fade/scale entrance is acceptable.

### EmptyState

Purpose: Communicates that a feature has no current data.
Mobile behavior: Short, useful, and not oversized.
Motion behavior: None.

### SourcePanel

Purpose: Compact transparency for data provenance.
Mobile behavior: Small, readable, and secondary.
Motion behavior: None.

---

## Notes For Future UI Overhaul

* Split Match History and Deck Advisor before applying major visual polish.
* Standardize panels, form fields, buttons, segmented controls, menus, and
  result/status chips first.
* Keep source transparency compact; it matters, but it should not crowd the
  advisor decision.
* Preserve speed and clarity over decorative motion.
* Avoid adding Pokemon IP styling unless it directly helps competitive deck
  recognition or decision-making.

## Overlay Card

Purpose:
Temporary information layer.

Behavior:
Appears above current screen.

Does not navigate away.

Dismiss:
Swipe down
Tap outside
Close button

Motion:
Fade + Scale

Use Cases:
- Event Creation
- Deck Preview
- Recommendation Details
- Settings