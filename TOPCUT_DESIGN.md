# Top Cut Design Contract

This document is the permanent design contract for the Top Cut app. It exists to keep future UI work visually consistent, especially across small iterative tasks.

## 1. Product Identity

Top Cut is a premium Pokemon TCG tournament companion.

The app should feel:

- Mobile-first
- Fast
- Sharp
- Competitive
- Polished
- Focused on tournament readiness and in-event decision making

Top Cut should not feel like a childish Pokemon-themed app. Avoid playful creature theming, cartoon styling, loud collectible-card nostalgia, noisy gradients, bulky cards, generic dashboard layouts, or SaaS-style admin screens.

The visual tone should suggest a serious player tool: clean enough for repeated use, refined enough to feel premium, and direct enough to support quick decisions during tournament play.

## 2. Visual System

Top Cut uses a dark-first interface.

Core visual principles:

- Use a black/slate foundation as the primary surface language.
- Prefer glass-like panels with restrained transparency or layered dark surfaces.
- Use soft borders to define structure without heavy outlines.
- Add subtle depth through shadow, blur, tint, and spacing rather than large elevation effects.
- Maintain a high-contrast text hierarchy with clear differences between primary, secondary, muted, and disabled text.
- Keep corners rounded but not bubbly. Rounded rectangles should feel precise and premium, not toy-like.
- Use color minimally. Reserve stronger color for status, match results, warnings, confirmations, deck archetype accents, and advisor outputs.
- Avoid one-note palettes, especially all-purple, all-blue, beige, brown, or orange-heavy themes.
- Avoid noisy gradients, decorative blobs, oversized glows, and unnecessary background effects.

The app should feel dark, crisp, and quietly dimensional.

## 3. Layout Rules

Top Cut is a mobile-first 9:16 experience.

Layout expectations:

- Design the primary experience for a phone-sized vertical viewport first.
- Desktop should feel like a centered mobile app or focused companion surface, not a stretched dashboard.
- Keep the main app width constrained on larger screens.
- Preserve breathing room between navigation, controls, panels, and primary content.
- Avoid overly dense tables. Prefer stacked rows, grouped panels, compact summaries, and progressive disclosure.
- Cards and panels should stack cleanly on mobile without horizontal scrolling.
- Important actions should remain easy to reach on mobile.
- Content should scan quickly during tournament use.
- Avoid nested card-on-card layouts unless the inner element has a clear functional purpose.
- Do not use landing-page hero patterns inside the app experience.

The layout should prioritize fast recognition, thumb-friendly interaction, and calm tournament pressure handling.

## 4. Component Rules

### AppShell

The AppShell is the main frame for the mobile-first app.

- Use a dark foundation with subtle layered surfaces.
- Constrain width on desktop so the app remains a centered companion interface.
- Account for safe areas, bottom navigation, and mobile viewport height.
- Keep page transitions smooth and restrained.
- Avoid desktop-dashboard chrome, wide sidebars, and oversized page headers.

### BottomNavigation

BottomNavigation is the primary mobile navigation pattern.

- Keep it fixed or consistently positioned at the bottom of the app surface.
- Use clear icon-first navigation with concise labels when helpful.
- Maintain large enough tap targets for comfortable mobile use.
- Indicate the active tab with a refined color, glow, border, or filled state.
- Avoid heavy pill shapes, oversized labels, or distracting animation.

### Panel

Panel is the default grouped content container.

- Use glass-like or layered dark styling.
- Include soft borders and subtle depth.
- Keep padding generous enough to breathe but compact enough for mobile.
- Use an 8px radius or similarly restrained radius unless existing styles require otherwise.
- Avoid bulky card styling and high-contrast box shadows.

### NestedPanel

NestedPanel is for secondary grouping inside a Panel.

- Use only when it improves comprehension or separates an interactive sub-area.
- Make it visually quieter than the parent Panel.
- Use less shadow, lower contrast, or a flatter surface.
- Avoid stacking multiple nested panels unless the workflow clearly requires it.

### OverlayCard

OverlayCard is used for modals, popovers, drawers, and temporary focused states.

- Keep overlays dark, crisp, and clearly above the base surface.
- Use backdrop blur or dark scrim carefully.
- Preserve readable contrast between the overlay and background.
- Keep actions obvious and easy to reach.
- Avoid decorative modal styling or oversized marketing-like presentation.

### SectionHeader

SectionHeader introduces a focused area of content.

- Keep headers compact and scannable.
- Use strong but not oversized type.
- Pair titles with concise supporting metadata only when useful.
- Align actions consistently to the right or below the title on mobile.
- Avoid large editorial headings inside compact app surfaces.

### EmptyState

EmptyState should explain absence without feeling like a marketing panel.

- Keep the message short, calm, and action-oriented.
- Include a clear next action when one exists.
- Use muted visual treatment with enough contrast to remain readable.
- Avoid cute illustrations, novelty copy, or excessive empty-state decoration.

### Buttons

Buttons should feel precise, responsive, and easy to tap.

- Maintain clear hit areas suitable for mobile.
- Use strong filled styling for primary actions.
- Use quieter outline, ghost, or text styling for secondary actions.
- Reserve destructive colors for destructive actions.
- Use status color sparingly and consistently.
- Include icons when they clarify the action.
- Avoid oversized rounded pills unless already established by the surrounding UI.
- Provide visible disabled, loading, pressed, and focused states.

### Inputs

Inputs should be dark, legible, and calm.

- Use clear labels or accessible names.
- Maintain readable placeholder and entered text contrast.
- Use soft borders and visible focus states.
- Keep error states obvious, with clear text near the affected field.
- Preserve mobile keyboard ergonomics with appropriate input types.
- Avoid cramped form layouts and tiny controls.

### Match Rows

Match rows should support quick tournament scanning.

- Prioritize opponent, deck/archetype, round, result, and relevant notes.
- Use compact stacked layouts on mobile.
- Highlight result/status with controlled color rather than large decorative treatments.
- Keep row actions discoverable without overwhelming the row.
- Avoid dense table layouts for match history on mobile.
- Preserve alignment so repeated rows are easy to compare.

### Advisor Result Cards

Advisor result cards should feel analytical and decisive.

- Present the recommendation or result clearly at the top.
- Use color only to reinforce status, confidence, matchup pressure, or action priority.
- Keep supporting reasoning concise and structured.
- Make follow-up actions easy to find.
- Avoid flashy win/loss visuals, casino-like emphasis, or excessive animation.
- Ensure updates feel smooth and trustworthy.

## 5. Motion Rules

Motion should make the app feel smoother, not flashy.

Use subtle transitions for:

- Tab changes
- Card entry
- Expand and collapse
- Swipe actions
- Result updates
- Overlay entry and dismissal
- Loading-to-content changes

Motion guidelines:

- Keep durations short and intentional.
- Prefer opacity, transform, and small scale changes.
- Avoid excessive bouncing, spinning, pulsing, confetti, novelty animation, or distracting loops.
- Do not animate layout in a way that makes content hard to track.
- Motion should reinforce state change and spatial continuity.

## 6. Accessibility Rules

Accessibility is part of the visual contract.

- Maintain readable contrast across all text, controls, icons, and status colors.
- Buttons and interactive controls must have clear hit areas.
- Focus states must be visible.
- Animations must respect reduced-motion preferences.
- Form errors must be clear, visible, and associated with the affected field.
- Do not rely on color alone to communicate results, warnings, or required action.
- Text must not overlap, truncate critical meaning, or become unreadable on mobile.
- Touch targets should remain usable under tournament conditions.

## 7. Codex Rule

Before making any UI change, read this file and preserve the existing Top Cut visual language unless the task explicitly says to change it.
