# ADR-0001: How end-to-end tests sign in

[Back to the Project 03 guide](../README.md#design-and-documentation)

**Status:** Proposed
**Date:** 2026-11-09
**Deciders:** Brandon Calvario (@bcalvario-csumb)
**Supersedes:** none
**Related PR(s):** the PR that closes #18

---

## Context

Listings belong to a user, so every listing route needs a token, and real sign-in (#8) isn't built yet.
Playwright also can't log in to GitHub or Google in CI, because bot detection and consent screens make it
unreliable. The guide requires a Playwright test of the signed-in vertical slice, and forbids any test
sign-in from being reachable in production.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Test-only Spring profile that mints the API's own JWT for a seeded user | The rest of the API runs as in production; it's the pattern in Appendix I, section 6.2 | Test code ships in the image, so it needs guard rails |
| Mock OIDC provider container | Exercises more of a sign-in flow | A second service in CI, and the app has no OAuth flow to exercise yet |
| Dev-signed JWT from a second key | No extra endpoint | The production decoder would have to trust a second key |
| Make the listing routes public until sign-in lands | Nothing to build | Listings would have no owner, and anyone could write to the deployed API |

## Decision

We will use an `e2e` Spring profile that adds `POST /test/token` and seeds two test users with listings.

## Consequences

- **Good:** listings are built and tested end to end before sign-in exists. Once sign-in mints tokens with the
  user's ID as `sub`, the listing routes need no change.
- **Good:** the guard rails are tested. The API refuses to start with `e2e` alongside `prod` or against a
  non-local database, and a test proves the route is absent without the profile.
- **Bad:** saving from the deployed app stays impossible until sign-in is merged, because the profile is never
  active on Render.
- **Follow-up:** the "Use test account" button is only for local work, and is removed when real sign-in lands.
  The `e2e` profile stays, because CI still needs it.
