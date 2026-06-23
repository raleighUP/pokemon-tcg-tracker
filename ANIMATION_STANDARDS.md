# Top Cut Animation Standards

This document defines when, where, and how Top Cut should use animation. It is intended to keep motion consistent, useful, and aligned with the app's premium tournament-focused design language.

## 1. Animation Philosophy

Animation in Top Cut should improve clarity, confidence, and polish.

Motion should help users understand:

- What changed
- Where content came from
- Which action completed
- Which item is active
- Which field or result needs attention

Animations should never slow down tournament logging. Tournament actions should feel instant, especially when recording matches, changing rounds, saving results, clearing forms, navigating tabs, or reviewing advisor output.

Motion should be subtle, premium, and mobile-native. It should feel like a refined app interaction layer, not a decorative effect.

Avoid:

- Flashy animation
- Cartoon motion
- Long transitions
- Excessive bounce
- Spinning for novelty
- Animations that block input
- Motion that makes the interface feel slower

## 2. Approved Animation Areas

### Tab/Page Transitions

Tab and page changes may use subtle transitions to preserve spatial continuity.

- Prefer short fade, slide, or shared-direction transitions.
- Keep the outgoing and incoming states readable.
- Avoid large page sweeps, dramatic zooms, or transitions that delay interaction.
- Navigation should feel immediate even when animated.

### Bottom Navigation Active Indicator

The active tab indicator may animate between destinations.

- Use a restrained movement, fade, underline, glow, or filled active state.
- Keep the indicator fast and precise.
- Avoid bouncing, elastic stretching, or oversized active states.
- The selected tab should be obvious without relying only on motion.

### Panel/Card Entrance

Panels and cards may animate when they first appear or when new content is inserted.

- Prefer small opacity and vertical transform changes.
- Keep movement short, usually 4-12px.
- Stagger only when it improves scanning, and keep the stagger very short.
- Avoid slow cascading lists that delay access to content.

### Event Expand/Collapse

Expandable event areas should animate height, opacity, or content reveal carefully.

- Keep expand/collapse smooth and predictable.
- Preserve the user's scroll position as much as possible.
- Avoid janky height animation on large content blocks.
- Use instant or near-instant disclosure when speed matters more than polish.

### Match Row Swipe Actions

Swipe actions may use motion to reveal available controls and confirm intent.

- Keep swipe response tightly coupled to the user's finger.
- Use subtle background reveal, icon movement, or action color.
- Snap points should feel crisp.
- Destructive actions must require clear intent and visible feedback.
- Avoid exaggerated elastic motion or hidden actions that are hard to discover.

### Save/Clear/Next Round Feedback

Core tournament actions need fast, clear feedback.

- Save should feel instant and confirm completion with a brief state change, checkmark, toast, or inline success treatment.
- Clear should confirm the reset without feeling dramatic.
- Next round should clearly indicate that the app advanced state.
- Feedback should not block continued logging unless confirmation is required.
- Avoid long success animations.

### Advisor Results Appearing/Reordering

Advisor results may animate as they appear, update, or reorder.

- Use subtle entry and position transitions to make result changes understandable.
- Preserve trust by avoiding flashy or casino-like result motion.
- Keep recommendation updates calm and readable.
- Do not animate in a way that makes rankings or priorities hard to track.

### Form Validation Shake/Highlight

Validation animation should direct attention without scolding the user.

- Prefer a brief highlight, border color change, or small shake.
- Shake motion must be very short and restrained.
- Pair animation with visible error text.
- Never rely on motion alone to communicate the error.

### Loading And Empty States

Loading and empty states may use quiet motion.

- Prefer subtle skeletons, fades, shimmer, or progress indicators.
- Keep loading animation lightweight and calm.
- Empty states may fade in but should not use playful illustration animation.
- Avoid spinners when a skeleton or direct state change would feel better.

## 3. Timing Guidelines

Use these practical defaults:

- Micro interactions: 120-180ms
- Standard transitions: 180-260ms
- Expand/collapse: 220-320ms
- Avoid anything over 400ms unless intentionally dramatic.

Most Top Cut interactions should feel complete in under 260ms. Longer animation should be reserved for rare moments where additional clarity is worth the extra time.

## 4. Easing Guidelines

Prefer smooth ease-out or ease-in-out motion.

Recommended motion feel:

- Fast response at the start
- Smooth deceleration into place
- No exaggerated overshoot
- No cartoon timing

Avoid springy or bouncy motion unless used very lightly and only where it improves touch feedback. Do not use elastic, rubbery, or playful easing for tournament workflows.

## 5. Reduced Motion

All animations must respect `prefers-reduced-motion`.

When reduced motion is enabled:

- Remove non-essential movement.
- Prefer opacity changes or instant state changes.
- Avoid transform-heavy transitions.
- Disable parallax, looping motion, shake effects, and animated reordering.
- Preserve all information, feedback, and state changes without requiring motion.

Reduced motion support is required for any new animation work.

## 6. Implementation Guidance

Start with CSS transitions where possible.

Use CSS for:

- Hover and press states
- Focus transitions
- Simple opacity changes
- Simple transform changes
- Active indicators
- Basic expand/collapse where performance is acceptable

Use Framer Motion or GSAP only when CSS becomes limiting.

Do not add animation libraries without a clear reason. A library may be justified when the interaction requires coordinated sequencing, interruptible gesture-driven movement, shared layout transitions, or more precise timeline control than CSS provides.

Implementation rules:

- Do not animate layout in ways that create jank on mobile.
- Prefer transform and opacity over expensive layout properties.
- Test on mobile-sized viewports.
- Keep animations interruptible where users may navigate quickly.
- Avoid blocking pointer or keyboard input during routine transitions.
- Keep animation code local to the component unless a shared pattern is clearly emerging.

## 7. Future GSAP Note

GSAP may be considered later for premium page transitions, advanced swipe polish, and complex sequencing after TestFlight or user feedback.

Potential future GSAP uses:

- More refined page transition timelines
- Gesture-responsive match row interactions
- Coordinated advisor result updates
- Complex overlay entry and dismissal sequences
- Premium onboarding or rare celebratory moments

Do not introduce GSAP preemptively. Add it only when real product feedback or implementation limits show that CSS or the existing animation approach is not enough.
