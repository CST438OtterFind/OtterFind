<!-- Keep a PR to one issue where you can. Small PRs get better reviews. -->

Closes #
<!-- The issue number. GitHub only closes it automatically when this PR targets main. -->

**PRD story:** <!-- For example PRD-4, or "Course requirement" for docs, CI and setup -->

## What changed and why

<!-- Two or three sentences. A teammate reading this should know what to look at. -->

## How to test it

<!-- Steps a reviewer can follow, including any setup. -->

1.
2.

## Screenshots

<!-- Delete this section if no screen changed. Web and Android are both required. -->

| Web | Android |
|---|---|
|  |  |

## Checklist

Check each box, or write "N/A" and why.

- [ ] New routes and tables are in `docs/openapi.yaml` and `docs/erd.md` in an **earlier commit** than the code that implements them (commit dates are graded)
- [ ] Tests cover the new behavior, including failures and rejections
- [ ] New owned resources have a test that user A gets 403 or 404 on user B's data
- [ ] Errors use Problem Details (`docs/error-model.md`)
- [ ] Public classes and functions have KDoc or TSDoc
- [ ] No secrets in the code or commits, and nothing secret is named `EXPO_PUBLIC_*`
- [ ] New environment variables are in `.env.example` and `docs/runbook.md`

**Tests I ran:**

- [ ] API: `./gradlew check` (from `api/`)
- [ ] App: `npm run typecheck` and `npm run test:coverage` (from `app/`)
- [ ] Browser: `npm run e2e` (from `app/`, with `docker compose up` running)
- [ ] Checked by hand on Android

## Notes for reviewers

<!-- Anything you're unsure about, or want a second opinion on. Delete if there's nothing. -->

<!-- Needs two approvals from teammates who aren't the author. Only the sprint's merge captain merges (docs/captains.md). -->
