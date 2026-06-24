# Top Cut Error Monitoring Plan

## Purpose

This document defines the privacy and implementation requirements for adding
Sentry to Top Cut in the future.

Sentry is not currently installed or configured. Error monitoring must remain
disabled until the provider setup, data scrubbing, environment configuration,
testing, and privacy disclosures are complete.

## Why Top Cut Needs Error Monitoring

Top Cut is designed for tournament use, where reliability matters and users may
have limited time to recover from an error.

Privacy-safe error monitoring could help identify:

- Unexpected application crashes.
- Failed page or component rendering.
- Errors during local data parsing, migration, import, or export.
- Browser and native-platform compatibility problems.
- Unhandled promise rejections.
- Repeated failures that are difficult to reproduce locally.
- Regressions introduced by new releases.

Error monitoring should help diagnose application reliability without becoming
a copy of the user's locally stored tournament data.

## What Should Be Captured

Only information needed to reproduce and prioritize technical failures should
be captured.

Approved categories include:

- Error type and sanitized error message.
- Sanitized stack trace.
- Application version and release identifier.
- Deployment environment, such as development or production.
- Route or controlled screen identifier.
- Browser family and operating system family.
- Device category, such as mobile, tablet, or desktop.
- Whether the app is running as web, PWA, iOS, or Android.
- A coarse timestamp for the error occurrence.
- Sanitized component stack information.
- Controlled feature context, such as `decks`, `history`, `advisor`, or
  `settings`.
- Aggregate booleans or buckets when required for diagnosis, such as
  `has_saved_decks` or `match_count_bucket`.

Context should use controlled enums, booleans, and buckets. It should not
include raw application records or user-entered text.

## What Should Not Be Captured

Top Cut error reports must not include:

- Decklist contents, card names, or card quantities.
- Deck names, archetypes, or variants entered by the user.
- Personal notes, match notes, or event notes.
- Opponent deck names.
- Event names or other user-entered identifiers.
- Imported or exported JSON contents.
- Imported or exported file names or paths.
- Clipboard contents.
- Raw request or response bodies containing application data.
- Full localStorage, sessionStorage, IndexedDB, or application-state snapshots.
- Form field values.
- Exact tournament records, match histories, or Advisor inputs.
- Authentication data, tokens, cookies, or secrets if accounts are added later.
- Precise location, contacts, advertising identifiers, or unrelated device
  information.
- Screen recordings, session replay, or automatic DOM text capture.

## Privacy Rules

1. Scrub all localStorage data from error reports.
2. Scrub sessionStorage, IndexedDB values, and serialized app state where
   possible.
3. Scrub user-entered form values, DOM text, breadcrumbs, and event payloads.
4. Do not capture decklist contents.
5. Do not capture personal notes.
6. Do not capture opponent deck names.
7. Do not capture imported or exported JSON.
8. Disable Sentry session replay unless a separate privacy review explicitly
   approves a safely configured use case.
9. Disable automatic user interaction breadcrumbs if they may include form
   values or user-entered text.
10. Do not attach files, local backups, screenshots, or storage snapshots to
    reports.
11. Do not set email addresses, names, or other personal identifiers as the
    Sentry user.
12. Use an anonymous, rotating, or installation-scoped identifier only if it is
    necessary and separately approved.
13. Limit retention to the shortest period that supports debugging.
14. Restrict Sentry project access to people who need it.
15. Review every custom tag, context object, and breadcrumb before release.
16. Keep error monitoring disabled if scrubbing cannot be verified.

## Required Privacy Policy Update

Before enabling Sentry in a production release, update the Top Cut Privacy
Policy to explain:

- That an error-monitoring provider is used.
- The provider's name and purpose.
- The categories of technical data that may be collected.
- That user-created decklists, notes, opponent names, and backup JSON are not
  intentionally collected.
- How data is processed, retained, secured, and deleted.
- Whether data is transferred to other countries.
- How users can ask privacy questions or request available data rights.
- A link to the provider's privacy documentation when appropriate.

The App Store privacy questionnaire must also be reviewed and updated before an
error-monitoring-enabled build is submitted.

## `beforeSend` Scrubbing Requirements

The future Sentry configuration must include a `beforeSend` handler that:

- Removes `request.data`, request bodies, and unsafe query parameters.
- Removes cookies and authorization headers.
- Removes localStorage, sessionStorage, and serialized state from contexts.
- Removes form values from exception messages, breadcrumbs, and extra data.
- Removes imported or exported JSON and file metadata.
- Removes deck, opponent, event, and note fields regardless of nesting.
- Allows only explicitly approved tags and context keys.
- Drops the entire event when safe sanitization cannot be guaranteed.

Scrubbing should be recursive because sensitive values may appear inside nested
objects, arrays, breadcrumbs, exception metadata, or custom contexts.

Recommended prohibited key patterns include:

- `decklist`
- `deckName`
- `opponentDeck`
- `notes`
- `eventName`
- `json`
- `import`
- `export`
- `localStorage`
- `sessionStorage`
- `clipboard`
- `formData`
- `password`
- `token`
- `authorization`
- `cookie`

Key-based scrubbing is a backstop, not the primary protection. Code should
avoid adding sensitive values to Sentry events in the first place.

## Later Implementation Checklist

1. Create a dedicated Sentry project for Top Cut.
2. Add the Sentry DSN to environment variables and deployment secrets.
3. Install the official Sentry SDK.
4. Configure the supported Next.js and React integration.
5. Add and verify recursive `beforeSend` scrubbing.
6. Test local error capture with synthetic errors and known sensitive values.
7. Update the Privacy Policy.
8. Update the App Store privacy answers.
9. Verify the production build.

## Additional Setup Checks

- Separate development, preview, and production environments.
- Configure release names and source maps without exposing secrets.
- Ensure the DSN is the only public Sentry configuration value.
- Disable session replay and automatic sensitive-data capture.
- Review default breadcrumbs and integrations individually.
- Configure sampling conservatively.
- Configure retention and team access.
- Add a documented kill switch.
- Verify disabled behavior when the DSN is absent.
- Confirm errors do not block normal app usage.
- Test on web, PWA, iOS, and Android targets as applicable.
- Inspect actual outgoing payloads before production enablement.
- Document how developers should add safe custom context.

## Release Gate

Sentry must not be enabled in production until:

- Scrubbing tests pass.
- Sample payloads contain no user-entered or locally stored content.
- Privacy Policy and App Store disclosures are updated.
- Retention and project access are configured.
- The production build and supported platforms are verified.
