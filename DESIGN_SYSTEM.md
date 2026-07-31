Pokemon TCG Tracker - Design Discovery Workbook

## Design Contract

* `TOPCUT_DESIGN.md` is the source of truth for visual direction.
* `ANIMATION_STANDARDS.md` is the source of truth for motion behavior.
* Any UI task should check both files before changing component styling, spacing, transitions, or layout behavior.
* Existing component primitives should be reused before creating new visual patterns.

Purpose
The goal of this document is to define the visual identity of the Pokemon TCG Tracker before beginning a full UI overhaul.
The objective is NOT to redesign individual screens.
The objective is to create a complete design system that can be applied consistently across the entire application.

1. Product Personality
Choose words that describe how the app should feel.
Examples:
Premium
Modern
Fast
Professional
Technical
Tactical
Desired Personality
I want this app to be highly usable, smooth, and still enjoyable to look at
The goal would be that if a screenshot of the app was shared on social media, it would be clean, easy to read, and look high quality.
The app’s usability in terms of inputting information, reading outputs, and maintaining running data is of the utmost importance
Personality Traits to Avoid
Very minimal/no pokemon IP or corny design choices
It so happens that our niche point is pokemon TCG, but the app shouldn’t look like that
Alot of apps in the space use very entry level/basic taste as a tradeoff for function, I don’t think we need to sacrifice

2. User Archetype
Who is the app primarily built for?
Primary User
Local Tournament Grinder
Secondary User
Regional and Worlds Competitors
Casual League Player
Non Users
This app has no catering towards judges, collectors, or content creators who aren’t playing the game competitively.
User Goals
Ample knowledge around decks, changes in meta, and stats to support decisions
Clean data delivery, feedback, and historicals
Incredibly easy to use, input data, and looks better than everyone else

3. Inspiration Sources
List products that feel similar to what you want.
Apps
 Instagram’s UX is one of the cleanest
Apple’s Liquid glass/most recent UX standards
Dark screen, smooth animations and buttons
Websites
I don’t think these websites have good UX or UI, but these are who we are competing for user share from:
Limitless.tcg
https://www.trainerhill.com/
https://x.com/poke_hive/status/2064019734580826428?s=20


Other Products
Robinhood, Acorns, Apple Wallet
A lot of financial apps are very data driven and need to display it in a readable way
Multiple tools featured in app, ability to move between

4. Visual Style Direction
For each item choose one.
Minimal vs Detailed:  I think it should look minimal, but have details “under the hood” or able to be shown if needed
Corporate
Modern
Layered
Clan 
Serious
Luxury

Visual-Heavy: again, data should be driving, and viewable with additional digging/clicks.

5. Color Direction

Primary Accent Color
176BB5
Secondary Accent Color
7D7878
Success Color
2F743B
Warning Color
DCC041
Error Color
A01818
Colors to Avoid
The majority of the app should be black and white tones. We can soften these a bit so it feels intentional. 
The blue should be used for most text highlights
The gray can be used for backing of cards or depth separation against the black
The app should be mostly black background, white text
The red yellow and green are mostly for the success, warning, error points, but can be used elsewhere sparingly.

6. Typography
Desired Feel
Examples:
Apple
Linear
Notion
Discord
Riot Client
Answer:
I’m not going to pay for fonts off the bat, so whatever is readily available we will work within
I like the big blocking with elements able to travel over it, so its large and readable, but not eating up valuable screen space
https://www.pinterest.com/pin/417005246774741943/
Header Style
Anytime we don’t have a strong stylistic taste for something, we should try and default as close to apples UX as possible.

7. Navigation
Current:
Bottom Navigation
Keep Bottom Navigation?
Bottom Navigation, but I’d like for it to be floating
Why?
Floating bottom navigation bar is the current standard for high quality apps
Swiping capabilities between tabs, clear liquid glass display if possible

8. Cards
Most of the app uses cards.
Card Shape
Slightly Rounded
Card Style
Glass
Elevated
Desired Examples
 https://www.pinterest.com/pin/417005246774741969/
https://www.pinterest.com/pin/417005246774741955/

9. Buttons
Button Style
Apple default, clear, liquid glass if possible
https://www.pinterest.com/pin/417005246774741956/

10. Forms
This will be a major area of focus for us
Depending on the type of information being inputted, i want the correct keyboard to pop up, if its only numbers, the numpad should appear
Have “next” pop up options above the keyboard, rather than having to click into the next text box to continue adding information
Using the apple pop up windows whenever possible rather than writing our own
Text boxes like “opponent’s deck” and “select archetype” should begin autofilling as a user types based on the database list.
Buttons should be big enough to easily use on mobile, and information should try to always display in a clean layout without wrapping or needing to scroll to see the full page.

11. Advisor Page
This is likely the flagship page.
Desired Feeling
The displayed information is just enough to make an educated choice, without showing every single input and source on screen
Visual clutter reduction will be the success point for this page being useable
Too much information and its messy, not enough and we’re just using a crystal ball.
Most Important Information
Rank in order:
Tournament Structure based on estimated players
What decks should I expect to see (meta share)
Recommended owned decks
Meta and Matchup sources
Comfort impact, final score
Least Important Information
Meta and Matchup sources
Comfort impact / final score

12. Match Logger
Desired Feeling
This is what will make or break users consistently using the app, it needs to be succinct and efficient to be able to quickly input necessary information between rounds
Should work smoothly, information flows quickly, and is digestible later after the event


Most Frequently Used Actions
Opponent’s deck
Match Record input
1st/2nd toggle
Match Notes
Current Frustrations
Cannot quickly move between the textbooks and buttons to enter information in smoothly
I imagine shopping cart experiences that drag you quickly and naturally to the next field input so you can reduce friction, this feels necessary here.
Having pop ups or alerts to denote information has been saved, next round/event has started.

13. Match History
Desired Feeling
This should be digestible at a glance to see how a user played over an event
Breakdowns of matchups and eventually culminating into tracked win rates
Most Important Data
The Who, What, When, Where’s of the tournament
 Opponent’s deck
Match Results
1st/2nd each game
Notes on the match
Current Frustrations
Trainingcourt’s match history is much cleaner and more concise than ours currently, this is the minimal goal 
We don’t currently use deck sprites, which I think is okay for now, but we are not as concise with our outputs as the image attached.
Can consider moving the “add round” from the match logging tab to the match history tab if this is found to be a better UX flow.

14. Mobile Experience
Primary Device
Iphone, fringe use case for android. I think maintaining a decent web browser for users playing online tournaments or tracking their PTCGL practice games, but the top use case will be users at tournaments between rounds.
One-Handed Usage Important?
Not expected, but the more autofill we use on textboxes the likelier this is doable
Thumb Reach Important?
Yes, expected.
Portrait Only?
Yes
Landscape Support?
No

15. Native App Direction
Long-Term Goal
PWA
App Store
Android
Both
Why?
Minimally we push out as a website that users can save as an “app” on their home screen
Cheap and easy
Would ideally end up as an app on the apple and android markets
Better reach, more legit, potential pokemon scrutiny

16. Screenshots Review
For every inspiration screenshot:
Screenshot Name
https://www.pinterest.com/pin/417005246774741943/
Keep
Big font labels and headers
Dark background with smooth color accents
Screenshot Name
https://www.pinterest.com/pin/417005246774741969/
Why
Modern, classy UI
Keep
Smooth animations
Pop up tab/window over main screen
Apple default UX
Why
Professional, clean looking app

17. Non-Negotiables
Things the redesign MUST achieve.
Incredibly smooth and functional information input 
UI update that makes the app sexy and enjoyable to look at
UX improvements to allow the user to access the tools more efficiently
Reduction of unnecessary displayed information and visual clutter

18. Deal Breakers
Things the redesign MUST NOT become.
 Standard “AI made this UI” look and feel
Cooler looking app that does a worse job solving the problem
Cool looking app thats clunky and not effective

# Light Mode Design System Addendum

## Goal

Light mode should feel like the inverse of the current premium dark theme, not
a generic white dashboard. Keep the same mobile-first, polished, glassy product
feel, but translate depth, contrast, and color into a bright interface.

## Core Direction

Dark mode is black-first with glass surfaces, soft borders, and glowing
accents.

Light mode should be:

* Warm white-first
* Soft card-based
* Slightly frosted, not flat
* High contrast without harsh black text
* Premium app-like, not default web UI

## Light Mode Color Tokens

```css
:root[data-theme='light'] {
  --app-bg: #f6f3ee;
  --app-bg-soft: #fbfaf7;

  --surface-primary: rgba(255, 255, 255, 0.82);
  --surface-secondary: rgba(248, 245, 239, 0.9);
  --surface-raised: rgba(255, 255, 255, 0.94);

  --border-soft: rgba(32, 28, 24, 0.08);
  --border-strong: rgba(32, 28, 24, 0.14);

  --text-primary: #181512;
  --text-secondary: #5f5a52;
  --text-muted: #8b8378;

  --accent-primary: #176bb5;
  --accent-primary-soft: rgba(23, 107, 181, 0.12);

  --success: #16834a;
  --success-soft: rgba(22, 131, 74, 0.12);

  --danger: #c83532;
  --danger-soft: rgba(200, 53, 50, 0.12);

  --warning: #a66b00;
  --warning-soft: rgba(166, 107, 0, 0.14);

  --shadow-soft: 0 18px 40px rgba(31, 24, 16, 0.08);
  --shadow-raised: 0 24px 60px rgba(31, 24, 16, 0.12);
}
```

## Background

Use a warm off-white base instead of pure white.

```css
background:
  radial-gradient(circle at top left, rgba(23, 107, 181, 0.07), transparent 34%),
  linear-gradient(180deg, #fbfaf7 0%, #f6f3ee 100%);
```

Avoid a pure white page background.

## Surfaces

Dark mode glass panels become bright frosted panels.

Primary cards use `var(--surface-primary)`, `var(--border-soft)`,
`var(--shadow-soft)`, and an 18px backdrop blur. Nested cards use the quieter
secondary surface. Raised overlays use the strongest white surface, border,
and shadow tokens.

## Text

Do not use pure black unless absolutely necessary. Primary text should be deep
espresso or charcoal, secondary text warm gray, and muted text soft taupe-gray.
Headings stay confident while helper text remains softer but readable.

## Navigation

Bottom navigation becomes a floating white or frosted dock with a soft warm
shadow. The active item uses a subtle blue tint and `var(--accent-primary)`;
inactive items use `var(--text-muted)`.

## Buttons

Primary buttons retain the brand blue, white text, and a restrained blue shadow.
Secondary buttons use a translucent white surface, soft border, and primary
text. Destructive buttons avoid heavy fills except for confirmed dangerous
actions.

## Inputs

Light inputs feel embedded rather than like default outlined forms. Use a
slightly cooler inset surface, a stronger warm-gray border, primary text, and a
blue-tinted focus ring. Controls should have visibly more contrast than their
parent cards.

## Match Result Colors

Win:

```css
background: rgba(22, 131, 74, 0.1);
color: #11663b;
border-color: rgba(22, 131, 74, 0.2);
```

Loss:

```css
background: rgba(200, 53, 50, 0.1);
color: #9f2928;
border-color: rgba(200, 53, 50, 0.2);
```

Tie:

```css
background: rgba(166, 107, 0, 0.12);
color: #805300;
border-color: rgba(166, 107, 0, 0.2);
```

## Motion

Motion rules remain identical between themes. Light mode adds no extra
animation, and reduced-motion behavior remains required.

## Implementation Notes

1. Add CSS theme tokens for light mode.
2. Keep the existing component class structure.
3. Replace hard-coded dark colors with semantic variables.
4. Add a Settings toggle for Dark, Light, and System.
5. Persist theme preference in localStorage.
6. Default to system preference.

## Quality Bar

Light mode should feel like the same app in daylight: premium, compact,
mobile-first, not sterile, not pure white, and not Tailwind default.

